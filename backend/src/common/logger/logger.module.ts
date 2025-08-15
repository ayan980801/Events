import { Global, Module, MiddlewareConsumer } from '@nestjs/common';
import pino from 'pino';
import { ConfigService } from '../../config/config.service';
import { PinoLoggerService } from './pino-logger.service';
import { CorrelationIdMiddleware, LoggingMiddleware } from './logger.middleware';

@Global()
@Module({
  providers: [
    {
      provide: 'PINO_LOGGER',
      useFactory: (configService: ConfigService) => {
        return pino({
          level: configService.monitoring.logLevel,
          ...(configService.isDevelopment && {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }),
          redact: {
            paths: [
              'password',
              'token',
              'secret',
              'key',
              'authorization',
              'cookie',
              'req.headers.authorization',
              'req.headers.cookie',
            ],
            censor: '[REDACTED]',
          },
        });
      },
      inject: [ConfigService],
    },
    PinoLoggerService,
    CorrelationIdMiddleware,
    LoggingMiddleware,
  ],
  exports: [PinoLoggerService, 'PINO_LOGGER'],
})
export class LoggerModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, LoggingMiddleware)
      .forRoutes('*');
  }
}