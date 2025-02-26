import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import {
  VisaRecommendationService,
  VisaRecommendationResult,
} from './visa-recommendation.service';

@Controller('visa-recommendation')
export class VisaRecommendationController {
  constructor(
    private readonly visaRecommendationService: VisaRecommendationService,
  ) {}

  @Post('determine')
  async determineBestVisaType(
    @Body() userResponses: any,
  ): Promise<VisaRecommendationResult> {
    if (!userResponses || Object.keys(userResponses).length === 0) {
      throw new BadRequestException('User responses are required.');
    }

    return this.visaRecommendationService.determineBestVisaType(userResponses);
  }
}
