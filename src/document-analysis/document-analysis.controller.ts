import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { DocumentAnalysisService } from './document-analysis.service';

@Controller('document-analysis')
export class DocumentAnalysisController {
  constructor(
    private documentService: DocumentService,
    private documentAnalysisService: DocumentAnalysisService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string },
  ) {
    return this.documentService.uploadDocument(body.userId, file); // User ID should come from auth
  }

  @Post('analyze/:documentId')
  async analyzeDocument(@Param('documentId') documentId: string) {
    return this.documentAnalysisService.analyzeDocument(documentId);
  }
}
