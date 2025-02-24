import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VisaRecommendationModule } from './visa-recommendation/visa-recommendation.module';
import { JobRecommendationModule } from './job-recommendation/job-recommendation.module';
import { DocumentGenerationModule } from './document-generation/document-generation.module';
import { ConsultantMatchingModule } from './consultant-matching/consultant-matching.module';
import { PaymentModule } from './payment/payment.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { PrismaService } from './database/prisma.service';
import { DocumentAnalysisModule } from './document-analysis/document-analysis.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    VisaRecommendationModule,
    JobRecommendationModule,
    DocumentGenerationModule,
    ConsultantMatchingModule,
    PaymentModule,
    ChatbotModule,
    DocumentAnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
