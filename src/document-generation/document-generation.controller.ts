import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  DocumentGenerationService,
  GeneratedDocument,
} from './document-generation.service';
import * as fs from 'fs';
import { Response } from 'express';

// ✅ Define DTO for structured request body
interface GenerateDocumentsDto {
  userId: string;
  visaType: string;
  answers: Record<string, any>; // Adjust type based on actual structure
  uploadedDocuments?: string[]; // Optional array of document URLs or paths
}

@Controller('document-generation')
export class DocumentGenerationController {
  constructor(private documentGenerationService: DocumentGenerationService) {}

  // ✅ Generate Visa Documents
  @Post('generate-content')
  async generateDocuments(
    @Body() data: GenerateDocumentsDto,
  ): Promise<GeneratedDocument[]> {
    if (!data.visaType || !data.answers) {
      throw new BadRequestException('Visa type and answers are required.');
    }

    return this.documentGenerationService.generateDocuments(
      data.userId,
      data.visaType,
      data.answers,
      data.uploadedDocuments || [],
    );
  }

  // ✅ API to Preview Generated PDF
  @Get('preview/:documentId')
  async previewUserDocuments(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const documents =
      await this.documentGenerationService.getUserGeneratedDocuments(userId);

    if (!documents.length) {
      throw new NotFoundException('No documents found for this user.');
    }

    // Return the first document for now (or modify to preview all)
    const pdfPath = documents[0].pdfPath;
    if (!pdfPath) {
      throw new NotFoundException('PDF path not found.');
    }
    res.sendFile(pdfPath);
  }

  // ✅ API to Download Generated PDF
  @Get('download/:documentId')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const pdfPath =
      await this.documentGenerationService.getGeneratedDocumentPath(documentId);
    if (!fs.existsSync(pdfPath)) {
      throw new NotFoundException('Document not found.');
    }
    res.download(pdfPath);
  }
}
