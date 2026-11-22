import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('وضعیت سرور را با status ok برمی‌گرداند', () => {
      const result = controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.docs).toBe('/api');
      expect(result.timestamp).toBeDefined();
    });
  });
});
