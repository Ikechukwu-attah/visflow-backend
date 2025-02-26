import { Test, TestingModule } from '@nestjs/testing';
import { VisaRecommendationController } from './visa-recommendation.controller';

describe('VisaRecommendationController', () => {
  let controller: VisaRecommendationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaRecommendationController],
    }).compile();

    controller = module.get<VisaRecommendationController>(VisaRecommendationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
