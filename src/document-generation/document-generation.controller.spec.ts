import { Test, TestingModule } from '@nestjs/testing';
import { DocumentGenerationController } from './document-generation.controller';

describe('DocumentGenerationController', () => {
  let controller: DocumentGenerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentGenerationController],
    }).compile();

    controller = module.get<DocumentGenerationController>(DocumentGenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
