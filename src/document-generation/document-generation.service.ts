import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OpenAI } from 'openai';
import { PdfGenerationService } from 'src/pdf-generation/pdf-generation.service';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface GeneratedDocument {
  documentType: string;
  format: string;
  pageCount: number;
  content: string;
  pdfPath?: string;
}

@Injectable()
export class DocumentGenerationService {
  private openai: OpenAI;

  constructor(
    private pdfService: PdfGenerationService,
    private prisma: PrismaService, // ✅ Inject Prisma Service
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

  async generateDocuments(
    userId: string | null, // ✅ Allow anonymous users
    visaType: string,
    answers: Record<string, any>,
    uploadedDocuments: string[],
  ): Promise<GeneratedDocument[]> {
    console.log('📌 Generating documents for:', visaType);

    const formattedUploads = uploadedDocuments.length
      ? `\n\n📌 **Uploaded Documents (For Reference):**\n${uploadedDocuments.join(
          '\n',
        )}`
      : '';

    const prompt = `
      You are an AI assistant specializing in visa-related document generation.  
  Given the visa type and user details, generate all required documents.

📌 **Visa Type:** ${visaType}  
📌 **User Information:**  
${JSON.stringify(answers, null, 2)}  
${formattedUploads}

📌 **Document Requirements:**  
- **Ensure multiple documents are generated where necessary** (e.g., Study Plan, Statement of Purpose, Financial Proof and many more).
- **Each document should be 250-500 words minimum.**
- **Generate at least 2-4 relevant documents that is needed base on user input.**
- **Follow professional formatting (e.g., letters should have addresses and salutations).**

📌 **Return the generated documents in valid JSON format (No Markdown):**
[
  {
    "documentType": "Statement of Purpose",
    "format": "Letter",
    "pageCount": 2,
    "content": "Detailed document content..."
  },
  {
    "documentType": "Study Plan",
    "format": "Official Form",
    "pageCount": 2,
    "content": "Detailed document content..."
  }
]
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from AI.');
      }

      let content = response.choices[0]?.message?.content?.trim();
      console.log('🔹 AI Response:', content);

      if (!content) {
        throw new Error('AI response content is undefined.');
      }

      content = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const documents: GeneratedDocument[] = JSON.parse(
        content,
      ) as GeneratedDocument[];

      // ✅ Store in Database
      const savedDocuments: GeneratedDocument[] = [];

      for (const doc of documents) {
        const pdfPath = await this.pdfService.generatePDF(
          doc.documentType,
          doc.content,
        );

        const savedDoc = await this.prisma.generatedDocument.create({
          data: {
            id: uuidv4(), // Unique ID for each document
            userId,
            visaType,
            documentType: doc.documentType,
            format: doc.format,
            pageCount: doc.pageCount,
            content: doc.content,
            pdfPath, // Store the PDF file path
            createdAt: new Date(),
          },
        });

        savedDocuments.push(savedDoc);
      }

      return savedDocuments; // ✅ Return stored documents
    } catch (error) {
      console.error('❌ AI Document Generation Error:', error);
      throw new BadRequestException('Failed to generate documents.');
    }
  }

  async getGeneratedDocumentPath(documentId: string): Promise<string> {
    const document = await this.prisma.generatedDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.pdfPath) {
      throw new NotFoundException('Document not found.');
    }

    return document.pdfPath;
  }

  async getUserGeneratedDocuments(
    userId: string,
  ): Promise<GeneratedDocument[]> {
    return await this.prisma.generatedDocument.findMany({
      where: { userId },
    });
  }
}
