import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Extract user ID from JWT token if available
    const userId = (request as any).user?.sub || (request as any).user?.id;

    // Log incoming request
    this.logger.log(`Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.log(
          `Outgoing Response: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
        );

        // Track API call analytics
        this.analyticsService.trackApiCall(
          url,
          method,
          userId,
          responseTime,
          statusCode,
        );

        // Log additional details for certain endpoints
        if (url.includes('/auth/')) {
          this.logger.log(`Auth endpoint accessed: ${url} by user ${userId || 'anonymous'}`);
        }

        if (url.includes('/chat/')) {
          this.logger.log(`Chat endpoint accessed: ${url} by user ${userId || 'anonymous'}`);
        }
      }),
      catchError((error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const statusCode = error.status || 500;

        // Log error
        this.logger.error(
          `Error Response: ${method} ${url} - ${statusCode} - ${responseTime}ms - ${error.message}`,
          error.stack,
        );

        // Track error analytics
        this.analyticsService.trackError(
          error.message,
          userId,
          {
            endpoint: url,
            method,
            statusCode,
            responseTime,
            stack: error.stack,
          },
        );

        // Re-throw the error
        throw error;
      }),
    );
  }
}