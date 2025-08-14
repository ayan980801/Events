import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ModerationResult {
  isAllowed: boolean;
  confidence: number;
  flaggedContent: string[];
  severity: 'low' | 'medium' | 'high' | 'severe';
  action: 'allow' | 'warn' | 'filter' | 'block';
  reason?: string;
}

interface ContentFilters {
  toxicity: boolean;
  harassment: boolean;
  hateSpeech: boolean;
  spam: boolean;
  explicitContent: boolean;
  personalInfo: boolean;
  violence: boolean;
  selfHarm: boolean;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly bannedWords: Set<string>;
  private readonly suspiciousPatterns: RegExp[];
  private readonly personalInfoPatterns: RegExp[];

  constructor(private configService: ConfigService) {
    // Initialize banned words list
    this.bannedWords = new Set([
      // Explicit content
      'explicit1',
      'explicit2',
      'explicit3',
      // Hate speech examples (would be more comprehensive in production)
      'hate1',
      'hate2',
      'hate3',
      // Harassment examples
      'harassment1',
      'harassment2',
      // Violence examples
      'violence1',
      'violence2',
    ]);

    // Suspicious patterns for various types of harmful content
    this.suspiciousPatterns = [
      // Spam patterns
      /(.)\1{10,}/gi, // Repeated characters
      /(?:buy now|click here|limited time|act fast|free money|get rich quick)/gi,
      // Potential harassment
      /(?:kill yourself|kys|end your life)/gi,
      // Hate speech patterns
      /(?:nazi|hitler|holocaust denial)/gi,
    ];

    // Personal information patterns
    this.personalInfoPatterns = [
      // Phone numbers
      /(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      // Email addresses
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Credit card numbers (basic pattern)
      /(?:\d{4}[-\s]?){3}\d{4}/g,
      // Social Security Numbers
      /\d{3}-\d{2}-\d{4}/g,
    ];
  }

  async moderateContent(
    content: string,
    userId?: string,
    context?: 'chat' | 'profile' | 'comment',
    filters: Partial<ContentFilters> = {},
  ): Promise<ModerationResult> {
    const startTime = Date.now();

    try {
      // Apply default filters if none specified
      const activeFilters: ContentFilters = {
        toxicity: true,
        harassment: true,
        hateSpeech: true,
        spam: true,
        explicitContent: true,
        personalInfo: true,
        violence: true,
        selfHarm: true,
        ...filters,
      };

      const flaggedContent: string[] = [];
      let maxSeverity: 'low' | 'medium' | 'high' | 'severe' = 'low';
      let confidence = 0;

      // Check for banned words
      if (activeFilters.explicitContent || activeFilters.hateSpeech) {
        const lowerContent = content.toLowerCase();
        for (const word of this.bannedWords) {
          if (lowerContent.includes(word)) {
            flaggedContent.push(`Banned word: ${word}`);
            maxSeverity = this.escalateSeverity(maxSeverity, 'high');
            confidence = Math.max(confidence, 0.9);
          }
        }
      }

      // Check suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          flaggedContent.push(`Suspicious pattern detected: ${matches[0]}`);
          maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
          confidence = Math.max(confidence, 0.7);
        }
      }

      // Check for personal information
      if (activeFilters.personalInfo) {
        for (const pattern of this.personalInfoPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            flaggedContent.push(`Personal information detected`);
            maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
            confidence = Math.max(confidence, 0.8);
          }
        }
      }

      // Check for spam indicators
      if (activeFilters.spam) {
        const spamScore = this.calculateSpamScore(content);
        if (spamScore > 0.6) {
          flaggedContent.push(`High spam probability: ${(spamScore * 100).toFixed(1)}%`);
          maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
          confidence = Math.max(confidence, spamScore);
        }
      }

      // Check for toxicity using simple heuristics
      if (activeFilters.toxicity) {
        const toxicityScore = this.calculateToxicityScore(content);
        if (toxicityScore > 0.5) {
          flaggedContent.push(`Potential toxicity detected: ${(toxicityScore * 100).toFixed(1)}%`);
          maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
          confidence = Math.max(confidence, toxicityScore);
        }
      }

      // Determine action based on severity and confidence
      let action: 'allow' | 'warn' | 'filter' | 'block' = 'allow';
      let isAllowed = true;

      if (flaggedContent.length > 0) {
        if (maxSeverity === 'severe' || (maxSeverity === 'high' && confidence > 0.8)) {
          action = 'block';
          isAllowed = false;
        } else if (maxSeverity === 'high' || (maxSeverity === 'medium' && confidence > 0.7)) {
          action = 'filter';
          isAllowed = false;
        } else if (maxSeverity === 'medium' || confidence > 0.5) {
          action = 'warn';
          isAllowed = true; // Allow but warn
        }
      }

      const result: ModerationResult = {
        isAllowed,
        confidence,
        flaggedContent,
        severity: maxSeverity,
        action,
        reason: flaggedContent.length > 0 ? flaggedContent.join('; ') : undefined,
      };

      // Log moderation result
      const processingTime = Date.now() - startTime;
      this.logger.debug(`Content moderation completed in ${processingTime}ms`, {
        userId,
        context,
        contentLength: content.length,
        result,
      });

      // Log flagged content for review
      if (flaggedContent.length > 0) {
        this.logger.warn(`Content flagged for user ${userId}`, {
          context,
          action,
          severity: maxSeverity,
          flags: flaggedContent,
          contentPreview: content.substring(0, 100),
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error during content moderation', error);

      // Fail safe - allow content but log error
      return {
        isAllowed: true,
        confidence: 0,
        flaggedContent: ['Moderation error occurred'],
        severity: 'low',
        action: 'allow',
        reason: 'Moderation service temporarily unavailable',
      };
    }
  }

  async moderateBatch(
    contents: Array<{ id: string; content: string; userId?: string; context?: string }>,
  ): Promise<Array<{ id: string; result: ModerationResult }>> {
    const results = [];

    for (const item of contents) {
      const result = await this.moderateContent(item.content, item.userId, item.context as any);
      results.push({ id: item.id, result });
    }

    return results;
  }

  async filterContent(content: string, replacement: string = '[FILTERED]'): Promise<string> {
    let filteredContent = content;

    // Replace banned words
    for (const word of this.bannedWords) {
      const regex = new RegExp(word, 'gi');
      filteredContent = filteredContent.replace(regex, replacement);
    }

    // Replace personal information
    for (const pattern of this.personalInfoPatterns) {
      filteredContent = filteredContent.replace(pattern, '[REDACTED]');
    }

    return filteredContent;
  }

  private escalateSeverity(
    current: 'low' | 'medium' | 'high' | 'severe',
    new_severity: 'low' | 'medium' | 'high' | 'severe',
  ): 'low' | 'medium' | 'high' | 'severe' {
    const levels = { low: 1, medium: 2, high: 3, severe: 4 };
    return levels[new_severity] > levels[current] ? new_severity : current;
  }

  private calculateSpamScore(content: string): number {
    let score = 0;

    // Check for excessive repetition
    if (/(.)\1{5,}/.test(content)) score += 0.3;

    // Check for excessive capitalization
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.5) score += 0.2;

    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    if (punctuationRatio > 0.2) score += 0.2;

    // Check for URL patterns
    if (/https?:\/\//.test(content)) score += 0.1;

    // Check for promotional language
    const promoWords = ['buy', 'sale', 'discount', 'offer', 'deal', 'free', 'win', 'prize'];
    const promoCount = promoWords.filter((word) => content.toLowerCase().includes(word)).length;
    score += promoCount * 0.1;

    return Math.min(score, 1);
  }

  private calculateToxicityScore(content: string): number {
    let score = 0;

    // Check for aggressive language patterns
    const aggressivePatterns = [
      /\b(stupid|idiot|moron|dumb)\b/gi,
      /\b(shut up|go away|get lost)\b/gi,
      /\b(hate|despise|loathe)\b/gi,
      /[!]{3,}/g, // Multiple exclamation marks
    ];

    for (const pattern of aggressivePatterns) {
      if (pattern.test(content)) {
        score += 0.2;
      }
    }

    // Check for ALL CAPS (aggressive tone)
    const allCapsWords = content.match(/\b[A-Z]{4,}\b/g);
    if (allCapsWords && allCapsWords.length > 2) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  // Public methods for admin use
  addBannedWord(word: string): void {
    this.bannedWords.add(word.toLowerCase());
    this.logger.log(`Added banned word: ${word}`);
  }

  removeBannedWord(word: string): boolean {
    const removed = this.bannedWords.delete(word.toLowerCase());
    if (removed) {
      this.logger.log(`Removed banned word: ${word}`);
    }
    return removed;
  }

  getBannedWords(): string[] {
    return Array.from(this.bannedWords);
  }

  getStatistics(): {
    bannedWordsCount: number;
    patternsCount: number;
    personalInfoPatternsCount: number;
  } {
    return {
      bannedWordsCount: this.bannedWords.size,
      patternsCount: this.suspiciousPatterns.length,
      personalInfoPatternsCount: this.personalInfoPatterns.length,
    };
  }
}
