import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OpenAI } from 'openai';
import { PdfGenerationService } from '../pdf-generation/pdf-generation.service';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuidv4, validate as isUUID } from 'uuid';
import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import * as path from 'path';
import { DocumentRequirementService } from 'src/document-requirement/document-requirement.service';

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
    private prisma: PrismaService,
    private requiredDocumentService: DocumentRequirementService,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

  async generateAndMergeDocuments(
    userId: string,
    visaType: string,
    answers: Record<string, any>,
    uploadedDocuments: string[],
  ): Promise<{ mergedPdfPath: string }> {
    console.log('📌 Generating documents for:', visaType);

    // ✅ Step 1: Fetch Required Documents for Visa Type
    const requiredDocs =
      await this.requiredDocumentService.getRequiredDocuments(visaType);
    if (!requiredDocs || requiredDocs.requiredDocuments.length === 0) {
      throw new BadRequestException('No required documents found.');
    }

    const requiredDocsFormatted = requiredDocs.requiredDocuments
      .map((doc, index) => `- ${index + 1}. ${doc}`)
      .join('\n');

    const formattedUploads = uploadedDocuments.length
      ? `📌 **User Uploaded Documents (For Reference):**\n${uploadedDocuments.join('\n')}`
      : '📌 **No User Documents Uploaded**';

    // ✅ Step 2: AI Smart Prompt for Document Generation
    const prompt = `
      🔹 **AI Visa Document Generator**  
You are an advanced AI specializing in **visa application document preparation**.  
Your task is to **analyze visa requirements and generate ALL necessary documents** that must be created **by the applicant**.  

🚨 **VERY IMPORTANT** 🚨  
✔ **DO NOT generate documents that must come from an institution** (e.g., Passports, Bank Statements, Police Certificates, or University Letters).  
✔ **ONLY generate documents that require the applicant to write or explain** (e.g., Statement of Purpose, Personal Explanation, Study Plan, Travel History).  
✔ **Ensure that ALL required applicant-generated documents are covered.**  

---
📌 **Applicant Details**  
- **Visa Type:** ${visaType}  
- **User-Provided Details:**  
${JSON.stringify(answers, null, 2)}  
${formattedUploads}  

---
📌 **🚀 AI Task: Identify & Generate User-Required Documents**  
1️⃣ **Analyze the visa type & user-provided details.**  
2️⃣ **Cross-check against standard visa document requirements.**  
3️⃣ **Determine ALL necessary documents that must be created by the user.**  
4️⃣ **Generate each document with complete details & professional formatting.**  

---
📌 **STRICT AI RULES for Document Generation**  
✔ **Ensure formal structure** (minimum 800 words per document).  
✔ **Follow official visa guidelines & maintain professional tone.**  
✔ **Ensure proper formatting (headings, salutations, structured paragraphs).**  
✔ **Each document must be professionally structured & realistic.**  
✔ **Return at least 4-6 documents where applicable.**  

---
📌 **🔥 AI Output Format (Strict JSON, No Markdown, No Explanations)**  
[
  {
    "documentType": "Detected Document Type Based on Visa Type",
    "format": "Letter / Statement / Official Form",
    "pageCount": 2,
    "content": "Full, professionally written document content..."
  },
  {
    "documentType": "Another Required Document",
    "format": "Official Statement",
    "pageCount": 3,
    "content": "Another full, detailed document..."
  }
]
---
🚨 **DO NOT include any explanations or extra text outside of the JSON array.**
  `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No AI response received.');
      }

      let content = response.choices[0]?.message?.content?.trim();
      console.log('🔹 Raw AI Response:', content); // ✅ Debugging Step

      if (!content) {
        throw new Error('AI response content is undefined.');
      }

      // ✅ Step 1: Clean AI response (Remove markdown, newlines)
      content = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // ✅ Step 2: Validate JSON Format
      let documents: GeneratedDocument[];

      try {
        // Attempt to parse AI response
        documents = JSON.parse(content) as GeneratedDocument[];

        // ✅ Ensure it's an array
        if (!Array.isArray(documents)) {
          throw new Error('AI response is not a JSON array.');
        }

        // ✅ Ensure it contains valid documents
        if (documents.length === 0) {
          throw new Error('AI did not generate any documents.');
        }

        for (const doc of documents) {
          if (
            !doc.documentType ||
            !doc.format ||
            !doc.content ||
            !doc.pageCount
          ) {
            throw new Error('AI returned an incomplete document structure.');
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse AI response:', error);

        // ✅ Step 3: AI Response Fallback (Extract JSON Manually)
        const jsonMatch = content.match(/\[.*\]/s); // Extract JSON array from response
        if (jsonMatch) {
          try {
            documents = JSON.parse(jsonMatch[0]) as GeneratedDocument[];
          } catch (jsonError) {
            console.error('❌ Fallback Parsing Failed:', jsonError);
            throw new BadRequestException(
              'AI document generation failed. Invalid format.',
            );
          }
        } else {
          throw new BadRequestException(
            'AI document generation failed. Response format invalid.',
          );
        }
      }

      // ✅ Step 4: Generate PDFs & Save to Database
      const savedDocuments: GeneratedDocument[] = [];
      const pdfPaths: string[] = [];

      for (const doc of documents) {
        const pdfPath = await this.pdfService.generatePDF(
          doc.documentType,
          doc.content,
        );

        if (!isUUID(userId)) {
          throw new BadRequestException(
            'Invalid userId format. Must be a UUID.',
          );
        }

        const savedDoc = await this.prisma.generatedDocument.create({
          data: {
            id: uuidv4(),
            userId,
            visaType,
            documentType: doc.documentType,
            format: doc.format,
            pageCount: doc.pageCount,
            content: doc.content,
            pdfPath,
            createdAt: new Date(),
          },
        });

        savedDocuments.push(savedDoc);
        pdfPaths.push(pdfPath);
      }

      // ✅ Step 5: Merge PDFs into a Single Document
      const mergedPdfPath = await this.mergePdfFiles(pdfPaths, userId);
      return { mergedPdfPath };
    } catch (error) {
      console.error('❌ AI Document Generation Error:', error);
      throw new BadRequestException('Failed to generate documents.');
    }
  }

  //Merge PDF files
  async mergePdfFiles(pdfPaths: string[], userId: string): Promise<string> {
    if (!pdfPaths.length) {
      throw new Error('No PDFs to merge.');
    }

    const mergedPdf = await PDFDocument.create();

    for (const pdfPath of pdfPaths) {
      if (!fs.existsSync(pdfPath)) continue;
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const outputDir = path.join(__dirname, '../../merged_pdfs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const mergedPdfPath = path.join(
      outputDir,
      `Merged_Documents_${userId}.pdf`,
    );
    fs.writeFileSync(mergedPdfPath, await mergedPdf.save());

    return mergedPdfPath;
  }
  //Get the latest merged PDF path
  getLatestMergedPdfPath(userId: string): string {
    const mergedPdfPath = path.join(
      __dirname,
      `../../merged_pdfs/Merged_Documents_${userId}.pdf`,
    );

    if (!fs.existsSync(mergedPdfPath)) {
      throw new NotFoundException('No merged document available.');
    }

    return mergedPdfPath;
  }
}
