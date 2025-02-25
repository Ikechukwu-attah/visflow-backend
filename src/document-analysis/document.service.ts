import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4, validate as isUUID } from 'uuid'; // ✅ Import UUID validator
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; documentId: string }> {
    if (!file || typeof file !== 'object') {
      throw new BadRequestException('No file uploaded or invalid file format');
    }

    console.log('📥 Received file for upload:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.buffer.length,
    });

    // Validate required file properties
    const { originalname, mimetype, buffer } = file;
    if (!originalname || !mimetype || !buffer) {
      throw new BadRequestException(
        'Invalid file format or missing properties',
      );
    }

    // ✅ Ensure userId is a valid UUID
    if (!isUUID(userId)) {
      throw new BadRequestException('User ID is not a valid UUID');
    }

    try {
      const fileId: string = uuidv4(); // ✅ Generate a proper UUID
      console.log('🆔 Generated File ID:', fileId);

      // Validate UUID before inserting
      if (!isUUID(fileId)) {
        throw new BadRequestException('Generated ID is not a valid UUID');
      }

      // ✅ Restrict allowed file types (PDFs & images)
      const allowedMimeTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
      ];
      if (!allowedMimeTypes.includes(mimetype)) {
        throw new BadRequestException('Unsupported file type.');
      }

      // ✅ Define file storage path
      const uploadsDir = path.join(__dirname, '../../../uploads'); // Ensure absolute path
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📂 Created uploads directory:', uploadsDir);
      }

      // ✅ Append timestamp to avoid filename collisions
      const timestamp = Date.now();
      const sanitizedFileName = originalname.replace(/\s+/g, '_'); // Replace spaces
      const filePath = path.join(
        uploadsDir,
        `${fileId}-${timestamp}-${sanitizedFileName}`,
      );

      // ✅ Ensure buffer is valid
      const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

      // ✅ Save file locally
      fs.writeFileSync(filePath, fileBuffer);
      console.log('✅ File saved successfully:', filePath);

      // ✅ Save document metadata in the database
      await this.prisma.document.create({
        data: {
          id: fileId,
          userId,
          fileName: originalname,
          fileType: mimetype,
          filePath,
          status: 'pending',
        },
      });

      console.log('📄 File metadata stored in DB:', {
        fileId,
        userId,
        filePath,
      });

      return { message: 'File uploaded successfully', documentId: fileId };
    } catch (error: unknown) {
      console.error('❌ Upload Error:', error);

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'File upload failed due to an unknown error',
      );
    }
  }
}
