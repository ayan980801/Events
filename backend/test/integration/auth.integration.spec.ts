import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

describe('Authentication Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'test_user',
          password: process.env.DB_PASSWORD || 'test_password',
          database: process.env.DB_DATABASE || 'test_db',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '24h' },
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.name).toBe(registerDto.name);
      expect(response.body.user).not.toHaveProperty('password');

      // Store for later tests
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should fail to register with duplicate email', async () => {
      const registerDto = {
        name: 'Another User',
        email: 'test@example.com', // Same email as above
        password: 'Test456!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(401);
    });

    it('should fail to register with invalid email', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Test123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail to register with weak password', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'weak@example.com',
        password: '123', // Too weak
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginDto.email);
    });

    it('should fail to login with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Test123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should fail to login with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('/auth/google (POST)', () => {
    it('should login successfully with mock Google token', async () => {
      const googleAuthDto = {
        token: 'google_mock_token_123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/google')
        .send(googleAuthDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should fail with invalid Google token', async () => {
      const googleAuthDto = {
        token: 'invalid_token',
      };

      await request(app.getHttpServer())
        .post('/auth/google')
        .send(googleAuthDto)
        .expect(401);
    });
  });

  describe('/auth/apple (POST)', () => {
    it('should login successfully with mock Apple token', async () => {
      const appleAuthDto = {
        token: 'apple_mock_token_123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/apple')
        .send(appleAuthDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should fail with invalid Apple token', async () => {
      const appleAuthDto = {
        token: 'invalid_token',
      };

      await request(app.getHttpServer())
        .post('/auth/apple')
        .send(appleAuthDto)
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail to get profile without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail to get profile with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      
      // Update token for subsequent tests
      authToken = response.body.token;
    });

    it('should fail to refresh without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });
  });

  describe('Protected routes', () => {
    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail to access protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/chat/conversations')
        .expect(401);
    });

    it('should fail to access protected route with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      await request(app.getHttpServer())
        .get('/chat/conversations')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should allow normal request rate', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Test123!',
          })
          .expect(200);
      }
    });

    it('should rate limit excessive requests', async () => {
      // Make many requests quickly to trigger rate limiting
      const promises = Array.from({ length: 25 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword!',
          })
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Security headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Input validation and sanitization', () => {
    it('should sanitize malicious input in registration', async () => {
      const maliciousDto = {
        name: '<script>alert("xss")</script>Test User',
        email: 'xss@example.com',
        password: 'Test123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(maliciousDto)
        .expect(201);

      // Name should be sanitized
      expect(response.body.user.name).not.toContain('<script>');
      expect(response.body.user.name).not.toContain('alert');
    });

    it('should reject extremely large payloads', async () => {
      const largePayload = {
        name: 'A'.repeat(10000),
        email: 'large@example.com',
        password: 'Test123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(largePayload)
        .expect(413); // Payload too large
    });
  });

  describe('Analytics tracking', () => {
    it('should track login events', async () => {
      // This would require checking analytics service
      // For now, just ensure login works and doesn't throw
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        })
        .expect(200);
    });
  });
});