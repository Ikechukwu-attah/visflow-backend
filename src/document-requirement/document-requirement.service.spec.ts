import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRequirementService } from './document-requirement.service';

describe('DocumentRequirementService', () => {
  let service: DocumentRequirementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentRequirementService],
    }).compile();

    service = module.get<DocumentRequirementService>(DocumentRequirementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
