import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result.message).toBe('AI Chatbot API is healthy');
    });

    it('should return version info', () => {
      const result = appController.getVersion();
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
      expect(result.version).toBe('1.0.0');
    });
  });
});
