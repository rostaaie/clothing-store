import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RecommenderController } from './recommender.controller';
import { RecommenderService } from './recommender.service';

describe('RecommenderController', () => {
  let controller: RecommenderController;
  const recommenderService = {
    getSimilarProducts: jest.fn(),
    getFrequentlyBoughtTogether: jest.fn(),
    getPersonalizedRecommendations: jest.fn(),
    getTopSellingProducts: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommenderController],
      providers: [
        { provide: RecommenderService, useValue: recommenderService },
      ],
    }).compile();

    controller = module.get<RecommenderController>(RecommenderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSimilar', () => {
    it('محصولات مشابه را با statusCode 200 و message فارسی برمی‌گرداند', async () => {
      recommenderService.getSimilarProducts.mockResolvedValue([{ id: 2 }]);

      const result = await controller.getSimilar(1);

      expect(recommenderService.getSimilarProducts).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'محصولات مشابه',
        data: [{ id: 2 }],
      });
    });
  });

  describe('getBoughtTogether', () => {
    it('محصولات همراه خرید را برمی‌گرداند', async () => {
      recommenderService.getFrequentlyBoughtTogether.mockResolvedValue([
        { id: 5, purchasedTogether: 3 },
      ]);

      const result = await controller.getBoughtTogether(1);

      expect(
        recommenderService.getFrequentlyBoughtTogether,
      ).toHaveBeenCalledWith(1);
      expect(result.data).toHaveLength(1);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('getForMe', () => {
    it('پیشنهاد شخصی را با userId کاربر لاگین‌شده و limit پیش‌فرض 10 می‌گیرد', async () => {
      recommenderService.getPersonalizedRecommendations.mockResolvedValue([
        { id: 2 },
      ]);

      const result = await controller.getForMe(42, 10);

      expect(
        recommenderService.getPersonalizedRecommendations,
      ).toHaveBeenCalledWith(42, 10);
      expect(result.data).toEqual([{ id: 2 }]);
    });

    it('limit ارسالی کلاینت را عبور می‌دهد', async () => {
      recommenderService.getPersonalizedRecommendations.mockResolvedValue([]);

      await controller.getForMe(42, 5);

      expect(
        recommenderService.getPersonalizedRecommendations,
      ).toHaveBeenCalledWith(42, 5);
    });
  });

  describe('getTopSelling', () => {
    it('پرفروش‌ترین‌ها را با limit پیش‌فرض 10 می‌گیرد', async () => {
      recommenderService.getTopSellingProducts.mockResolvedValue([{ id: 3 }]);

      const result = await controller.getTopSelling();

      expect(recommenderService.getTopSellingProducts).toHaveBeenCalledWith(10);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });
});
