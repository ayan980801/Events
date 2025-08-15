import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PinoLoggerService } from '../logger/pino-logger.service';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | object;
  error: string;
  correlationId?: string;
  details?: any;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let error: string;
    let message: string | object;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = exception.name;
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).details;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = exception.name || 'InternalServerError';
      message = 'Internal server error';
      details = process.env.NODE_ENV === 'development' ? exception.message : undefined;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'UnknownError';
      message = 'An unknown error occurred';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      correlationId: request.correlationId,
      ...(details && { details }),
    };

    // Log the error with appropriate level
    if (status >= 500) {
      this.logger.logError(
        exception instanceof Error ? exception : new Error(String(exception)),
        'GlobalExceptionFilter',
        {
          statusCode: status,
          path: request.url,
          method: request.method,
          correlationId: request.correlationId,
        },
      );
    } else if (status >= 400) {
      this.logger.warn(
        {
          statusCode: status,
          path: request.url,
          method: request.method,
          message,
          correlationId: request.correlationId,
        },
        'ClientError',
      );
    }

    response.status(status).json(errorResponse);
  }
}