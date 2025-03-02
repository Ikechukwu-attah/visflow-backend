import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DocumentGenerationService } from './document-generation.service';

import * as fs from 'fs';
import { Response } from 'express';
import { GenerateDocumentsDto } from './dto/generate-document.dto';

@Controller('document-generation')
export class DocumentGenerationController {
  constructor(private documentGenerationService: DocumentGenerationService) {}

  // ✅ Generate Documents API
  @Post('generate-content')
  generateDocuments(@Body() data: GenerateDocumentsDto) {
    if (!data.userId || !data.visaType || !data.answers) {
      throw new BadRequestException(
        'User ID, visa type, and answers are required.',
      );
    }
    console.log('📌 Generating documents for user id :', data.userId);
    return this.documentGenerationService.generateAndMergeDocuments(
      data.userId,
      data.visaType,
      data.answers,
      data.uploadedDocuments || [],
    );
  }

  // ✅ Preview Merged PDF
  @Get('preview/:userId')
  previewMergedDocument(@Param('userId') userId: string, @Res() res: Response) {
    const pdfPath =
      this.documentGenerationService.getLatestMergedPdfPath(userId);

    if (!fs.existsSync(pdfPath)) {
      throw new NotFoundException('No merged document available.');
    }

    res.sendFile(pdfPath);
  }

  // ✅ Download Merged PDF
  @Get('download/:userId')
  downloadMergedDocument(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const pdfPath =
      this.documentGenerationService.getLatestMergedPdfPath(userId);

    if (!fs.existsSync(pdfPath)) {
      throw new NotFoundException('No merged document available.');
    }

    res.download(pdfPath);
  }
}
