import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';

export interface ClassificationResponse {
  predictedType: string; // ✅ AI-predicted document type
  confidence: number; // ✅ AI confidence score
  summary: string; // ✅ Explanation of classification
}

@Injectable()
export class DocumentClassificationService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

  async classifyDocument(documentId: string): Promise<ClassificationResponse> {
    console.log(`Classifying document: ${documentId}`);

    // Step 1: Retrieve document from DB
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const filePath: string = path.resolve(document.filePath);
    console.log(`Processing file: ${filePath}`);

    // Step 2: Extract Text from Document
    const extractedText: string | null = await this.extractText(
      filePath,
      document.fileType,
    );

    if (!extractedText) {
      throw new BadRequestException('Failed to extract text from document.');
    }

    // Step 3: Call AI model for classification
    const classificationResult: ClassificationResponse =
      await this.classifyWithGPT4(extractedText);

    console.log('🔹 Final Classification Result:', classificationResult);

    // ✅ Update DB without overriding response
    await this.prisma.document.update({
      where: { id: documentId },
      data: { predictedDocumentType: classificationResult.predictedType }, // ✅ Update new column
    });

    // ✅ Explicitly return AI classification
    return classificationResult;
  }

  // 🔹 Extract Text from Document (PDF & Image)
  private async extractText(
    filePath: string,
    fileType: string,
  ): Promise<string | null> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File does not exist.');
    }

    console.log('Extracting text from:', filePath);
    console.log('Detected file type:', fileType);

    try {
      // Ensure lowercase for consistency
      const normalizedType = fileType.toLowerCase();
      let extractedText: string | null = null;

      if (
        normalizedType.includes('pdf') ||
        normalizedType.includes('application/pdf')
      ) {
        console.log('✅ Detected as a PDF');
        const pdfBuffer: Buffer = fs.readFileSync(filePath);
        const pdfData = await pdf(pdfBuffer);
        extractedText = pdfData.text?.trim() || null;
      } else if (
        normalizedType.includes('image') ||
        normalizedType.includes('png') ||
        normalizedType.includes('jpeg') ||
        normalizedType.includes('jpg')
      ) {
        console.log('✅ Detected as an Image');
        const processedImageBuffer: Buffer = await sharp(filePath)
          .resize(1000)
          .toBuffer();

        const result = await Tesseract.recognize(processedImageBuffer, 'eng');
        extractedText = result.data.text?.trim() || null;
      } else {
        throw new BadRequestException(
          `Unsupported file type detected: ${fileType}`,
        );
      }

      // ✅ Log the extracted text for debugging
      console.log('🔹 Extracted Text:', extractedText || '[NO TEXT EXTRACTED]');

      return extractedText;
    } catch (error: unknown) {
      console.error('❌ Error extracting text:', error);
      return null;
    }
  }

  // 🔹 AI-Powered Document Classification
  private async classifyWithGPT4(
    documentText: string,
  ): Promise<ClassificationResponse> {
    console.log('Sending to GPT-4 for classification...');

    const prompt = `
    You are an AI trained to classify visa-related documents.
    Your task is to determine the exact document type based on the provided text.

    Examples of possible document types include:
    - Passport
    - Visa Application Form
    - Proof of Funds
    - Employment Letter
    - Bank Statement
    - Travel Itinerary
    - Invitation Letter
    - Supporting Affidavit
    - **Other visa-related document** (if none of the above exactly match)

    If the document does not clearly fit one of the predefined types, **do your best to infer its classification** based on its content.

    **Document Text:**
    "${documentText}"

    📌 **Expected JSON Response:**
    {
      "predictedType": "Detected Document Type",
      "confidence": 0-100, 
      "summary": "Short explanation of why this classification was chosen."
    }
  `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
      });

      // ✅ Validate response before parsing
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('No classification result received from GPT-4.');
      }

      const rawContent = response.choices[0]?.message?.content?.trim();
      console.log('🔹 GPT-4 Response:', rawContent);

      // ✅ Ensure rawContent is a string before parsing
      if (!rawContent) {
        throw new Error('Received empty classification response.');
      }

      let classification: ClassificationResponse;

      try {
        classification = JSON.parse(rawContent) as ClassificationResponse;
      } catch (jsonError) {
        console.error('Error parsing GPT-4 response:', jsonError);
        throw new Error('Invalid classification response format.');
      }

      console.log('🔹 Classification Result:', classification);
      return classification;
    } catch (error: unknown) {
      console.error('GPT-4 Classification Error:', error);
      return {
        predictedType: 'Unknown',
        confidence: 0,
        summary: 'Classification failed',
      };
    }
  }
}
