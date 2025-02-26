import { Controller, Get, Query, BadRequestException } from '@nestjs/common';

import { DocumentRequirementResponse } from './document.requirements.types';
import { DocumentRequirementService } from './document-requirement.service';

@Controller('documents-requirements')
export class DocumentRequirementController {
  constructor(
    private readonly documentRequirementsService: DocumentRequirementService,
  ) {}

  @Get('list')
  async getRequiredDocuments(
    @Query('visaType') visaType: string,
  ): Promise<DocumentRequirementResponse> {
    if (!visaType) {
      throw new BadRequestException('Visa type is required.');
    }
    return this.documentRequirementsService.getRequiredDocuments(visaType);
  }
}
