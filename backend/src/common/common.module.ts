import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { AnalyticsService } from './services/analytics.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SecurityMiddleware } from './middleware/security.middleware';

@Module({
  providers: [
    CacheService,
    AnalyticsService,
    LoggingInterceptor,
    RateLimitGuard,
    SecurityMiddleware,
  ],
  exports: [
    CacheService,
    AnalyticsService,
    LoggingInterceptor,
    RateLimitGuard,
    SecurityMiddleware,
  ],
})
export class CommonModule {}