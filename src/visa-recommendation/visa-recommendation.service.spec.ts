import { Test, TestingModule } from '@nestjs/testing';
import { VisaRecommendationService } from './visa-recommendation.service';

describe('VisaRecommendationService', () => {
  let service: VisaRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaRecommendationService],
    }).compile();

    service = module.get<VisaRecommendationService>(VisaRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
