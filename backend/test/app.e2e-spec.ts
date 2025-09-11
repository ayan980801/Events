import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Set the global prefix to match the main app
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('/version (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/version')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('environment');
      });
  });
});
