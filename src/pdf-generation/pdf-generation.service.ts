import { Injectable, BadRequestException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfGenerationService {
  private outputDir = path.join(__dirname, '../../../generated_pdfs'); // Save PDFs in this directory

  constructor() {
    // Ensure the PDF storage directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generatePDF(documentType: string, content: string): Promise<string> {
    try {
      const pdfFileName = `${documentType.replace(/\s+/g, '_')}-${Date.now()}.pdf`;
      const pdfFilePath = path.join(this.outputDir, pdfFileName);

      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(pdfFilePath);
      doc.pipe(writeStream);

      // **PDF Header**
      doc.fontSize(20).text(documentType, { align: 'center' }).moveDown(2);

      // **PDF Body Content**
      doc.fontSize(12).text(content, {
        align: 'left',
        lineGap: 6,
      });

      doc.end();

      // Wait for PDF file to be fully written before returning the file path
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(pdfFilePath));
        writeStream.on('error', (error) => reject(error));
      });
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw new BadRequestException('Failed to generate PDF.');
    }
  }
}
