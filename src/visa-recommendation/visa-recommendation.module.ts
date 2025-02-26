import { Module } from '@nestjs/common';
import { VisaRecommendationService } from './visa-recommendation.service';
import { VisaRecommendationController } from './visa-recommendation.controller';

@Module({
  providers: [VisaRecommendationService],
  controllers: [VisaRecommendationController]
})
export class VisaRecommendationModule {}
