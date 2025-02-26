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

interface AIAnalysis {
  fraudDetected: boolean;
  missingFields: string[];
  recommendations: string;
  confidence?: number;
  fraudReasons?: string[];
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
        confidence: aiAnalysis.confidence,
        fraudReasons: aiAnalysis.fraudReasons,
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
        const result = await Tesseract.recognize(processedImageBuffer, 'eng');
        console.log('🔹 Extracted Image Text:', result.data.text);
        return result.data.text?.trim() || null; // ✅ Log Extracted Text
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
          You are an AI trained to analyze **ALL visa-related documents** for fraud detection.
Your goal is to assess whether a document is **authentic** or **potentially fraudulent** based on these checks:

📌 **1️⃣ Document Integrity Checks**
   - Compare extracted text with official templates.
   - Ensure required sections (e.g., signatures, official seals, dates) are present.
   - Verify if document follows standard structure.

📌 **2️⃣ Fraud Detection (Only If Strong Evidence Exists)**
   - **Manipulated or missing official seals & stamps.**
   - **Inconsistent document structure or formatting.**
   - **Mismatched details (e.g., employer name vs. company registry).**
   - **Irregular bank transactions in financial statements.**
   - **Fake or forged supporting letters.**
   - **Altered or missing signatures on legal documents.**

📌 **3️⃣ Expected JSON Response**
Return a JSON response **WITHOUT markdown formatting**:
{
  "fraudDetected": true/false,
  "confidence": 0-100,
  "fraudReasons": [
    "Discrepancy in employer details: Job offer states 'ABC Corp', company registry shows 'XYZ Ltd.'",
    "Inconsistent bank transactions: Account shows large deposits with no source."
  ],
  "missingFields": ["Signature", "Official Stamp"],
  "recommendations": "Verify employer information against official records."
}

📌 **Extracted Document Text:**
"${documentText}"
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
        console.log('🔹 AI Analysis:', analysis);

        // ✅ Ensure fraud detection is only applied for confidence > 85%
        if (analysis.fraudDetected && (analysis.confidence ?? 0) < 85) {
          console.log(
            '⚠ Fraud confidence too low, overriding fraud detection',
          );
          analysis.fraudDetected = false;
          analysis.fraudReasons = []; // Clear fraud reasons
        }

        return analysis;
      } catch (error) {
        console.error('❌ Failed to parse AI analysis response:', error);
        throw new Error('Failed to parse AI analysis response.');
      }
    } catch (error) {
      console.error('GPT-4 Analysis Error:', error);
      return {
        fraudDetected: false,
        confidence: 0,
        fraudReasons: [],
        missingFields: [],
        recommendations: 'No analysis available.',
      };
    }
  }
}
