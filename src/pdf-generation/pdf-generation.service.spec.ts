import { Test, TestingModule } from '@nestjs/testing';
import { PdfGenerationService } from './pdf-generation.service';

describe('PdfGenerationService', () => {
  let service: PdfGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGenerationService],
    }).compile();

    service = module.get<PdfGenerationService>(PdfGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
