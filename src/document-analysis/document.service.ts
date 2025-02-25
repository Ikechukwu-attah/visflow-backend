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
    console.log('Received userId:', userId);
    // Ensure file has required properties
    const { originalname, mimetype, buffer } = file;
    if (!originalname || !mimetype || !buffer) {
      throw new BadRequestException(
        'Invalid file format or missing properties',
      );
    }

    try {
      const fileId: string = uuidv4(); // ✅ Generate a proper UUID
      console.log('fileId', fileId);

      // ✅ Validate UUID before inserting
      if (!isUUID(fileId)) {
        throw new BadRequestException('Generated ID is not a valid UUID');
      }
      if (!isUUID(userId)) {
        throw new BadRequestException('User ID is not a valid UUID');
      }
      const uploadsDir = path.join(__dirname, '../../../uploads'); // ✅ Ensure absolute path
      const filePath = path.join(
        uploadsDir,
        `${fileId}-${originalname.trim()}`,
      );

      // ✅ Ensure `uploads/` directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // ✅ Ensure buffer is valid
      const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

      // ✅ Save file locally
      fs.writeFileSync(filePath, fileBuffer);

      // ✅ Save document metadata in the database
      await this.prisma.document.create({
        data: {
          id: fileId, // ✅ Ensure ID is a proper UUID
          userId,
          fileName: originalname,
          fileType: mimetype,
          filePath,
          status: 'pending',
        },
      });

      return { message: 'File uploaded successfully', documentId: fileId };
    } catch (error: unknown) {
      console.error('Upload Error:', error);

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'File upload failed due to an unknown error',
      );
    }
  }
}
