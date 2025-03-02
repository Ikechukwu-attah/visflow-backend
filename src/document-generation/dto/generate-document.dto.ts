export class GenerateDocumentsDto {
  userId: string;
  visaType: string;
  answers: Record<string, any>;
  uploadedDocuments?: string[];
}
