import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { AiProvidersModule } from './ai-providers/ai-providers.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import our custom services
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SecurityMiddleware } from './common/middleware/security.middleware';

// Import configuration helpers
import {
  getDatabaseConfig,
  getMongoConfig,
  getJwtConfig,
  getThrottlerConfig,
} from './config/database.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getThrottlerConfig,
      inject: [ConfigService],
    }),

    // PostgreSQL for relational data
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // MongoDB for chat history
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMongoConfig,
      inject: [ConfigService],
    }),

    // JWT
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),

    // Feature modules
    CommonModule,
    AuthModule,
    ChatModule,
    UsersModule,
    AiProvidersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global guards
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}