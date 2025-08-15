import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PinoLoggerService } from './common/logger/pino-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const securityConfig = configService.security;

  // Set up custom logger
  const logger = await app.resolve(PinoLoggerService);
  app.useLogger(logger);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Security middleware
  app.use(helmet(securityConfig.helmet));
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: securityConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Correlation-ID',
      'X-Request-ID',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 422,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (!configService.isProduction) {
    const config = new DocumentBuilder()
      .setTitle('AI Chatbot API')
      .setDescription('Backend API for the AI Chatbot mobile application')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('chat', 'Chat and conversation endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('ai-providers', 'AI provider endpoints')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = configService.port;
  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}`);
  if (!configService.isProduction) {
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
  logger.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
