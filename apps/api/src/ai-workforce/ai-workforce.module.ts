import { Module } from "@nestjs/common";
import { AiWorkforceController } from "./ai-workforce.controller";
import { AiWorkforceService } from "./ai-workforce.service";
import { AuditModule } from "../audit/audit.module";
import { ReportsModule } from "../reports/reports.module";
import { ComplianceModule } from "../compliance/compliance.module";

@Module({
  imports: [AuditModule, ReportsModule, ComplianceModule],
  controllers: [AiWorkforceController],
  providers: [AiWorkforceService],
})
export class AiWorkforceModule {}
