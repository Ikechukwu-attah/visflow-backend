import { Module } from '@nestjs/common';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentAnalysisController } from './document-analysis.controller';
import { PrismaService } from 'src/database/prisma.service';
import { DocumentService } from './document.service';
import { DocumentClassificationService } from './document-classification.service';

@Module({
  providers: [
    DocumentAnalysisService,
    PrismaService,
    DocumentService,
    DocumentClassificationService,
  ],
  controllers: [DocumentAnalysisController],
  exports: [
    DocumentAnalysisService,
    PrismaService,
    DocumentService,
    DocumentClassificationService,
  ],
})
export class DocumentAnalysisModule {}
