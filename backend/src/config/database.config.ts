import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get('NODE_ENV');
  
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'chatbot_user'),
    password: configService.get('DB_PASSWORD', 'chatbot_password'),
    database: configService.get('DB_DATABASE', 'chatbot_db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: nodeEnv === 'development',
    logging: nodeEnv === 'development' ? ['error', 'warn', 'migration'] : ['error'],
    ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    migrationsRun: true,
  };
};

export const getMongoConfig = (configService: ConfigService) => {
  return {
    uri: configService.get('MONGODB_URL', 'mongodb://localhost:27017/chatbot_history'),
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
};

export const getJwtConfig = (configService: ConfigService) => {
  return {
    secret: configService.get('JWT_SECRET', 'your-super-secret-jwt-key'),
    signOptions: {
      expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
    },
  };
};

export const getThrottlerConfig = (configService: ConfigService) => {
  return [
    {
      name: 'default',
      ttl: configService.get('THROTTLE_TTL', 60000), // 1 minute
      limit: configService.get('THROTTLE_LIMIT', 100), // 100 requests per minute
    },
    {
      name: 'auth',
      ttl: configService.get('AUTH_THROTTLE_TTL', 900000), // 15 minutes
      limit: configService.get('AUTH_THROTTLE_LIMIT', 10), // 10 requests per 15 minutes
    },
  ];
};

export const getCorsConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get('NODE_ENV');
  
  if (nodeEnv === 'production') {
    return {
      origin: configService.get('CORS_ORIGINS', '').split(','),
      credentials: true,
    };
  }
  
  return {
    origin: true,
    credentials: true,
  };
};