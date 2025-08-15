import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate a new one
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    
    // Set correlation ID on request object
    req.correlationId = correlationId;
    
    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  }
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Override res.end to capture response data
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]): any {
      const responseTime = Date.now() - startTime;
      
      // Log the request/response (will be picked up by PinoLoggerService)
      console.log({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        correlationId: req.correlationId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      
      return originalEnd(...args);
    };
    
    next();
  }
}