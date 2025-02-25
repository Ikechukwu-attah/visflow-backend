import { Test, TestingModule } from '@nestjs/testing';
import { DocumentAnalysisController } from './document-analysis.controller';

describe('DocumentAnalysisController', () => {
  let controller: DocumentAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentAnalysisController],
    }).compile();

    controller = module.get<DocumentAnalysisController>(DocumentAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
