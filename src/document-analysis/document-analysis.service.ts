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
         You are an AI expert in analyzing visa-related documents for fraud detection.
Your goal is to determine if a document is **authentic** or **potentially fraudulent**.

### **1️⃣ Authenticity Checks**:
   - Compare the extracted text with official visa-related templates.
   - Ensure all required fields are present (e.g., signatures, government stamps, unique document numbers).
   - Verify if the document text follows a standard, professional format.

### **2️⃣ Fraud Indicators (ONLY flag fraud if STRONG evidence exists)**:
   - **Fake or missing official stamps.**
   - **Inconsistent document structure** (e.g., missing sections, abnormal fonts, improper alignment).
   - **Unusual wording or non-standard formatting**.
   - **Blurry, manipulated, or incomplete text in scanned images.**
   - **Altered dates or names (e.g., mismatch between document content and official records).**
   - **Fake government references or invalid document numbers.**

### **3️⃣ Response Format**:
   Provide a JSON response **without markdown formatting**:
   {
      "fraudDetected": true/false,
      "confidence": 0-100, 
      "fraudReasons": ["Missing official stamp", "Date manipulation"],  
      "missingFields": ["Signature", "Date"],
      "recommendations": "Ensure the document has an official government stamp."
   }

### **Here is the extracted document text for analysis**:
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
