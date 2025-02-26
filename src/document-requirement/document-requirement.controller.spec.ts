import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRequirementController } from './document-requirement.controller';

describe('DocumentRequirementController', () => {
  let controller: DocumentRequirementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentRequirementController],
    }).compile();

    controller = module.get<DocumentRequirementController>(DocumentRequirementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
