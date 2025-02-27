import { Test, TestingModule } from '@nestjs/testing';
import { DocumentGenerationService } from './document-generation.service';

describe('DocumentGenerationService', () => {
  let service: DocumentGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentGenerationService],
    }).compile();

    service = module.get<DocumentGenerationService>(DocumentGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
