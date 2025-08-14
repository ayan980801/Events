import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { CacheService } from '../services/cache.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { ip, url, method } = request;
    
    // Get user ID if authenticated
    const userId = (request as any).user?.sub || (request as any).user?.id;
    
    // Create rate limit key
    const identifier = userId || ip;
    const rateLimitKey = `rate_limit:${identifier}:${method}:${url}`;
    
    // Different limits for different endpoints
    const limits = this.getRateLimits(url, userId);
    
    // Get current request count
    const currentCount = await this.cacheService.get<number>(rateLimitKey) || 0;
    
    // Check if limit exceeded
    if (currentCount >= limits.maxRequests) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          retryAfter: limits.windowMs / 1000,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    // Increment request count
    if (currentCount === 0) {
      // First request in window
      await this.cacheService.set(rateLimitKey, 1, limits.windowMs / 1000);
    } else {
      // Subsequent request
      await this.cacheService.increment(rateLimitKey);
    }
    
    return true;
  }

  private getRateLimits(url: string, userId?: string): { maxRequests: number; windowMs: number } {
    // Default limits
    let maxRequests = 100;
    let windowMs = 60 * 1000; // 1 minute

    // Authenticated users get higher limits
    if (userId) {
      maxRequests = 200;
    }

    // Specific endpoint limits
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      maxRequests = userId ? 20 : 10;
      windowMs = 15 * 60 * 1000; // 15 minutes
    } else if (url.includes('/chat/send')) {
      maxRequests = userId ? 100 : 20;
      windowMs = 60 * 1000; // 1 minute
    } else if (url.includes('/chat/conversations')) {
      maxRequests = userId ? 50 : 10;
      windowMs = 60 * 1000; // 1 minute
    } else if (url.includes('/ai-providers/models')) {
      maxRequests = userId ? 30 : 10;
      windowMs = 60 * 1000; // 1 minute
    }

    return { maxRequests, windowMs };
  }
}