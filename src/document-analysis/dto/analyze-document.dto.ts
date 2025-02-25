import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AnalyzeDocumentDto {
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}
