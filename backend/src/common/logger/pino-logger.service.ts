import { Injectable, Inject, ConsoleLogger, Scope } from '@nestjs/common';
import { Logger } from 'pino';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

export interface LoggerContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class PinoLoggerService extends ConsoleLogger {
  constructor(
    @Inject('PINO_LOGGER') private readonly logger: Logger,
    @Inject(REQUEST) private readonly request?: Request,
  ) {
    super();
  }

  private getContext(): LoggerContext {
    const context: LoggerContext = {};
    
    if (this.request) {
      context.correlationId = this.request.headers['x-correlation-id'] as string;
      context.requestId = this.request.headers['x-request-id'] as string;
      context.userId = (this.request as any).user?.id;
    }
    
    return context;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Clone the object to avoid modifying the original
    const sanitized = { ...data };
    
    // List of sensitive fields to redact
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'x-api-key',
      'jwt',
      'bearer',
    ];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  log(message: any, context?: string) {
    const logContext = this.getContext();
    if (typeof message === 'object') {
      this.logger.info(this.sanitizeData({ ...message, ...logContext }), context);
    } else {
      this.logger.info(logContext, `${context ? `[${context}] ` : ''}${message}`);
    }
  }

  error(message: any, trace?: string, context?: string) {
    const logContext = this.getContext();
    if (typeof message === 'object') {
      this.logger.error(this.sanitizeData({ ...message, trace, ...logContext }), context);
    } else {
      this.logger.error({ trace, ...logContext }, `${context ? `[${context}] ` : ''}${message}`);
    }
  }

  warn(message: any, context?: string) {
    const logContext = this.getContext();
    if (typeof message === 'object') {
      this.logger.warn(this.sanitizeData({ ...message, ...logContext }), context);
    } else {
      this.logger.warn(logContext, `${context ? `[${context}] ` : ''}${message}`);
    }
  }

  debug(message: any, context?: string) {
    const logContext = this.getContext();
    if (typeof message === 'object') {
      this.logger.debug(this.sanitizeData({ ...message, ...logContext }), context);
    } else {
      this.logger.debug(logContext, `${context ? `[${context}] ` : ''}${message}`);
    }
  }

  verbose(message: any, context?: string) {
    const logContext = this.getContext();
    if (typeof message === 'object') {
      this.logger.trace(this.sanitizeData({ ...message, ...logContext }), context);
    } else {
      this.logger.trace(logContext, `${context ? `[${context}] ` : ''}${message}`);
    }
  }

  // Custom logging methods with structured data
  logRequest(req: Request, res: any, responseTime?: number) {
    const context = {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime,
      correlationId: req.headers['x-correlation-id'],
      userId: (req as any).user?.id,
    };
    
    this.logger.info(this.sanitizeData(context), 'HTTP Request');
  }

  logError(error: Error, context?: string, additionalData?: any) {
    const logData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...additionalData,
      ...this.getContext(),
    };
    
    this.logger.error(this.sanitizeData(logData), context || 'Error');
  }

  logPerformance(operation: string, duration: number, metadata?: any) {
    const logData = {
      operation,
      duration,
      ...metadata,
      ...this.getContext(),
    };
    
    this.logger.info(this.sanitizeData(logData), 'Performance');
  }
}