import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private helmetMiddleware: any;
  private compressionMiddleware: any;

  constructor() {
    // Configure Helmet for security headers
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });

    // Configure compression
    this.compressionMiddleware = compression({
      level: 6,
      threshold: 1024,
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Apply Helmet security headers
    this.helmetMiddleware(req, res, (err: any) => {
      if (err) {
        return next(err);
      }

      // Apply compression
      this.compressionMiddleware(req, res, (compressionErr: any) => {
        if (compressionErr) {
          return next(compressionErr);
        }

        // Add custom security headers
        this.addCustomHeaders(req, res);

        // Sanitize request data
        this.sanitizeRequest(req);

        next();
      });
    });
  }

  private addCustomHeaders(req: Request, res: Response): void {
    // Remove server information
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Add API versioning header
    res.setHeader('X-API-Version', '1.0.0');

    // Add request ID for tracking
    const requestId = this.generateRequestId();
    res.setHeader('X-Request-ID', requestId);
    (req as any).requestId = requestId;
  }

  private sanitizeRequest(req: Request): void {
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = this.sanitizeString(req.query[key] as string);
        }
      }
    }

    // Sanitize request body (basic sanitization)
    if (req.body && typeof req.body === 'object') {
      this.sanitizeObject(req.body);
    }

    // Limit request size (this should also be configured at the application level)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      throw new Error('Request payload too large');
    }
  }

  private sanitizeObject(obj: any): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeObject(obj[key]);
        }
      }
    }
  }

  private sanitizeString(str: string): string {
    // Basic XSS prevention
    return str
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}