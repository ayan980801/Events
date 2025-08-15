import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { AiProvidersModule } from './ai-providers/ai-providers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GuardsModule } from './common/guards/guards.module';

@Module({
  imports: [
    // Configuration (with validation)
    ConfigModule,

    // Logging
    LoggerModule,

    // Scheduling for background tasks
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rateLimit = configService.rateLimit;
        return [
          {
            ttl: rateLimit.ttl,
            limit: rateLimit.limit,
            skipIf: rateLimit.skipIf,
          },
        ];
      },
      inject: [ConfigService],
    }),

    // PostgreSQL for relational data
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.database;
        return {
          type: 'postgres',
          url: dbConfig.url,
          autoLoadEntities: true,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          ssl: dbConfig.ssl,
          extra: dbConfig.poolSize ? { max: dbConfig.poolSize } : undefined,
        };
      },
      inject: [ConfigService],
    }),

    // MongoDB for chat history
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoConfig = configService.mongodb;
        return {
          uri: mongoConfig.url,
          ...mongoConfig.options,
        };
      },
      inject: [ConfigService],
    }),

    // JWT
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.jwt;
        return {
          secret: jwtConfig.secret,
          signOptions: { expiresIn: jwtConfig.accessExpiresIn },
        };
      },
      inject: [ConfigService],
    }),

    // Health checks
    HealthModule,

    // Common guards (must be imported before feature modules that use them)
    GuardsModule,

    // Feature modules
    AuthModule,
    ChatModule,
    UsersModule,
    AiProvidersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
