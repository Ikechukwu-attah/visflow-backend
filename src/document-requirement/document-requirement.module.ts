import { Module } from '@nestjs/common';
import { DocumentRequirementService } from './document-requirement.service';
import { DocumentRequirementController } from './document-requirement.controller';

@Module({
  providers: [DocumentRequirementService],
  controllers: [DocumentRequirementController],
})
export class DocumentRequirementModule {}
