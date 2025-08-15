import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnvironment } from './config.schema';

export interface DatabaseConfig {
  url: string;
  synchronize: boolean;
  logging: boolean;
  ssl?: boolean;
  poolSize?: number;
}

export interface MongoConfig {
  url: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export interface RedisConfig {
  url: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export interface JwtConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface AiConfig {
  openai?: {
    apiKey: string;
    organization?: string;
  };
  anthropic?: {
    apiKey: string;
  };
  mistral?: {
    apiKey: string;
  };
}

export interface RateLimitConfig {
  ttl: number;
  limit: number;
  skipIf?: (req: any) => boolean;
}

export interface SecurityConfig {
  corsOrigins: string[];
  helmet: {
    contentSecurityPolicy?: {
      directives?: any;
    };
  };
}

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService<EnvironmentVariables>) {}

  get nodeEnv(): NodeEnvironment {
    return this.configService.get('NODE_ENV', { infer: true }) || NodeEnvironment.DEVELOPMENT;
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true }) || 3000;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === NodeEnvironment.DEVELOPMENT;
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnvironment.PRODUCTION;
  }

  get isTest(): boolean {
    return this.nodeEnv === NodeEnvironment.TEST;
  }

  get database(): DatabaseConfig {
    const baseConfig: DatabaseConfig = {
      url: this.configService.getOrThrow('DATABASE_URL', { infer: true }),
      synchronize: false,
      logging: false,
    };

    // Environment-specific overrides
    switch (this.nodeEnv) {
      case NodeEnvironment.DEVELOPMENT:
        return {
          ...baseConfig,
          synchronize: true,
          logging: true,
        };
      case NodeEnvironment.TEST:
        return {
          ...baseConfig,
          synchronize: true,
          logging: false,
        };
      case NodeEnvironment.PRODUCTION:
        return {
          ...baseConfig,
          ssl: true,
          poolSize: 20,
        };
      default:
        return baseConfig;
    }
  }

  get mongodb(): MongoConfig {
    const baseConfig: MongoConfig = {
      url: this.configService.getOrThrow('MONGODB_URL', { infer: true }),
    };

    // Environment-specific overrides
    switch (this.nodeEnv) {
      case NodeEnvironment.PRODUCTION:
        return {
          ...baseConfig,
          options: {
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 5000,
          },
        };
      default:
        return baseConfig;
    }
  }

  get redis(): RedisConfig {
    const baseConfig: RedisConfig = {
      url: this.configService.get('REDIS_URL', { infer: true }) || 'redis://localhost:6379',
    };

    // Environment-specific overrides
    switch (this.nodeEnv) {
      case NodeEnvironment.PRODUCTION:
        return {
          ...baseConfig,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        };
      default:
        return baseConfig;
    }
  }

  get jwt(): JwtConfig {
    return {
      secret: this.configService.getOrThrow('JWT_SECRET', { infer: true }),
      accessExpiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) || '1h',
      refreshExpiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true }) || '7d',
    };
  }

  get ai(): AiConfig {
    const config: AiConfig = {};

    const openaiKey = this.configService.get('OPENAI_API_KEY', { infer: true });
    if (openaiKey) {
      config.openai = { apiKey: openaiKey };
    }

    const anthropicKey = this.configService.get('ANTHROPIC_API_KEY', { infer: true });
    if (anthropicKey) {
      config.anthropic = { apiKey: anthropicKey };
    }

    const mistralKey = this.configService.get('MISTRAL_API_KEY', { infer: true });
    if (mistralKey) {
      config.mistral = { apiKey: mistralKey };
    }

    return config;
  }

  get rateLimit(): RateLimitConfig {
    const baseConfig: RateLimitConfig = {
      ttl: this.configService.get('RATE_LIMIT_TTL', { infer: true }) || 60000,
      limit: this.configService.get('RATE_LIMIT_MAX', { infer: true }) || 100,
    };

    // Environment-specific overrides
    switch (this.nodeEnv) {
      case NodeEnvironment.TEST:
        return {
          ...baseConfig,
          skipIf: () => true, // Skip rate limiting in tests
        };
      case NodeEnvironment.DEVELOPMENT:
        return {
          ...baseConfig,
          limit: 1000, // More lenient in development
        };
      default:
        return baseConfig;
    }
  }

  get security(): SecurityConfig {
    const corsOrigins = this.configService.get('CORS_ORIGINS', { infer: true });
    const origins = corsOrigins ? corsOrigins.split(',').map(origin => origin.trim()) : [];

    // Default origins for development
    const defaultOrigins = this.isDevelopment ? 
      ['http://localhost:3000', 'http://localhost:8080'] : [];

    const baseConfig: SecurityConfig = {
      corsOrigins: origins.length > 0 ? origins : defaultOrigins,
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
      },
    };

    // Environment-specific overrides
    switch (this.nodeEnv) {
      case NodeEnvironment.DEVELOPMENT:
        return {
          ...baseConfig,
          helmet: {
            contentSecurityPolicy: undefined, // Disable CSP in development
          },
        };
      default:
        return baseConfig;
    }
  }

  get email(): { host?: string; port?: number; user?: string; pass?: string } {
    return {
      host: this.configService.get('SMTP_HOST', { infer: true }),
      port: this.configService.get('SMTP_PORT', { infer: true }),
      user: this.configService.get('SMTP_USER', { infer: true }),
      pass: this.configService.get('SMTP_PASS', { infer: true }),
    };
  }

  get upload(): { dir: string; maxSize: number } {
    return {
      dir: this.configService.get('UPLOAD_DIR', { infer: true }) || './uploads',
      maxSize: this.configService.get('MAX_FILE_SIZE', { infer: true }) || 10485760,
    };
  }

  get monitoring(): { sentryDsn?: string; logLevel: string } {
    return {
      sentryDsn: this.configService.get('SENTRY_DSN', { infer: true }),
      logLevel: this.configService.get('LOG_LEVEL', { infer: true }) || 'info',
    };
  }
}