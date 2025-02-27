import { Module } from '@nestjs/common';
import { DocumentGenerationService } from './document-generation.service';
import { DocumentGenerationController } from './document-generation.controller';
import { PdfGenerationService } from 'src/pdf-generation/pdf-generation.service';
import { PrismaService } from 'src/database/prisma.service';

@Module({
  providers: [DocumentGenerationService, PdfGenerationService, PrismaService],
  controllers: [DocumentGenerationController],
})
export class DocumentGenerationModule {}
