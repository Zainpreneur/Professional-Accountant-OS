import { Module } from "@nestjs/common";
import { DocumentIntelligenceController } from "./document-intelligence.controller";
import { DocumentIntelligenceService } from "./document-intelligence.service";
import { ClassificationController } from "./classification.controller";
import { ClassificationService } from "./classification.service";
import { DocumentsModule } from "../documents/documents.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [DocumentsModule, AuditModule],
  controllers: [DocumentIntelligenceController, ClassificationController],
  providers: [DocumentIntelligenceService, ClassificationService],
})
export class IntelligenceModule {}
