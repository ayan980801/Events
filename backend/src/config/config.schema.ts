import { IsString, IsOptional, IsPort, IsUrl, IsEnum, IsInt, Min, validateSync, IsNumber } from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num <= 65535 ? num : value;
  })
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  // Database Configuration
  @IsString()
  DATABASE_URL: string;

  @IsString()
  MONGODB_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  // JWT Configuration  
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // AI Provider API Keys
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  @IsOptional()
  MISTRAL_API_KEY?: string;

  // Frontend Configuration
  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:8080';

  // Email Configuration
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @Transform(({ value }) => {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num <= 65535 ? num : undefined;
  })
  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  // Rate Limiting
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_TTL: number = 60000; // 1 minute

  @IsInt()
  @Min(1)  
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_MAX: number = 100;

  // File Upload
  @IsString()
  @IsOptional()
  UPLOAD_DIR: string = './uploads';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  MAX_FILE_SIZE: number = 10485760; // 10MB

  // Security
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string; // Comma-separated list of allowed origins

  // Monitoring
  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsEnum(['error', 'warn', 'info', 'debug'])
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('\n')}`
    );
  }

  return validatedConfig;
}