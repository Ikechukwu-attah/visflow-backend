import { Module } from '@nestjs/common';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentAnalysisController } from './document-analysis.controller';
import { PrismaService } from 'src/database/prisma.service';
import { DocumentService } from './document.service';

@Module({
  providers: [DocumentAnalysisService, PrismaService, DocumentService],
  controllers: [DocumentAnalysisController],
  exports: [DocumentAnalysisService, PrismaService, DocumentService],
})
export class DocumentAnalysisModule {}
