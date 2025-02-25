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
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface AIAnalysis {
  fraudDetected: boolean;
  missingFields: string[];
  recommendations: string;
}

@Injectable()
export class DocumentAnalysisService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API Key! Set OPENAI_API_KEY in .env');
    }
  }

  async analyzeDocument(documentId: string) {
    console.log(`Analyzing document: ${documentId}`);

    // Step 1: Retrieve document from DB
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const filePath: string = path.resolve(document.filePath);

    console.log(`Processing file: ${filePath}`);
    console.log(`Checking file existence: ${filePath}`);
    console.log(
      fs.existsSync(filePath) ? '✅ File exists' : '❌ File not found',
    );

    // Step 2: Read file contents and extract text
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File does not exist.');
    }

    const extractedText = await this.extractText(filePath, document.fileType);

    if (!extractedText) {
      throw new BadRequestException('Failed to extract text from document.');
    }

    // Step 3: Call AI model for analysis
    const aiAnalysis: AIAnalysis = await this.analyzeWithAI(extractedText);

    // Step 4: Store analysis results in DB
    return await this.prisma.document.update({
      where: { id: documentId },
      data: {
        fraudDetected: aiAnalysis.fraudDetected,
        missingFields: aiAnalysis.missingFields,
        recommendations: aiAnalysis.recommendations,
        status: 'completed',
      },
    });
  }

  // 🔹 Extract Text from Document (Handles PDFs & Images)
  // 🔹 Extract Text from Document (Handles PDFs & Images)
  private async extractText(
    filePath: string,
    fileType: string,
  ): Promise<string | null> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File does not exist.');
    }

    try {
      if (fileType.includes('pdf')) {
        // ✅ Extract text from PDFs using `pdf-parse`
        const pdfBuffer: Buffer = fs.readFileSync(filePath);
        const pdfData = await pdf(pdfBuffer);

        return pdfData.text?.trim() || null;
      } else if (
        fileType.includes('image') ||
        fileType.includes('png') ||
        fileType.includes('jpg') ||
        fileType.includes('jpeg')
      ) {
        // ✅ Process image with `sharp` before OCR
        const processedImageBuffer: Buffer = await sharp(filePath)
          .resize(1000)
          .toBuffer();

        // ✅ Extract text from image using `tesseract.js`
        const { data } = await Tesseract.recognize(processedImageBuffer, 'eng');

        console.log('🔹 Extracted Image Text:', data.text); // ✅ Log Extracted Text
        return data.text?.trim() || null;
      } else {
        throw new BadRequestException('Unsupported file type.');
      }
    } catch (error) {
      console.error('❌ Error extracting text:', error);
      return null;
    }
  }

  // 🔹 AI-Powered Document Analysis
  // 🔹 AI-Powered Document Analysis
  private async analyzeWithAI(documentText: string) {
    console.log('Sending to GPT-4 for analysis...');

    const prompt = `
    You are an AI trained to analyze visa documents. 
    Given the document text below, determine:
    - If it meets standard visa application requirements.
    - Detect any fraud indicators.
    - Identify missing fields (e.g., signature, date, official stamp).

    Document Text:
    "${documentText}"

    Provide a structured JSON response **WITHOUT markdown formatting**:
    {
      "fraudDetected": true/false,
      "missingFields": ["Signature", "Date"],
      "recommendations": "Ensure the document has a valid official stamp."
    }
  `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('No AI analysis received.');
      }

      let content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No AI analysis received.');
      }

      // ✅ Remove markdown (triple backticks) before parsing JSON
      content = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      let analysis: AIAnalysis;
      try {
        analysis = JSON.parse(content) as AIAnalysis;
      } catch (error) {
        console.error('❌ Failed to parse AI analysis response:', error);
        throw new Error('Failed to parse AI analysis response.');
      }

      return analysis;
    } catch (error) {
      console.error('GPT-4 Analysis Error:', error);
      return {
        fraudDetected: false,
        missingFields: [],
        recommendations: 'No analysis available.',
      };
    }
  }
}
