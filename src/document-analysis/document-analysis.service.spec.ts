import { Test, TestingModule } from '@nestjs/testing';
import { DocumentAnalysisService } from './document-analysis.service';

describe('DocumentAnalysisService', () => {
  let service: DocumentAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentAnalysisService],
    }).compile();

    service = module.get<DocumentAnalysisService>(DocumentAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
