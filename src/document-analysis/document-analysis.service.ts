import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class DocumentAnalysisService {
  constructor(private prisma: PrismaService) {}

  async analyzeDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new BadRequestException('Document not found');

    // 🔹 Call AI Model for document analysis (To be implemented)
    const aiAnalysis = this.analyzeWithAI(document.filePath);

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        fraudDetected: aiAnalysis.fraudDetected,
        missingFields: aiAnalysis.missingFields,
        recommendations: aiAnalysis.recommendations,
        status: 'completed',
      },
    });
  }

  // Placeholder function for AI Analysis
  private analyzeWithAI(filePath: string) {
    console.log(filePath);
    // Simulated AI processing
    return {
      fraudDetected: Math.random() < 0.2, // 20% chance of fraud
      missingFields: ['Signature', 'Date'], // Example missing fields
      recommendations: 'Ensure document is signed and dated.',
    };
  }
}
