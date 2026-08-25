import { Module } from "@nestjs/common";
import { TaxPeriodsController } from "./tax-periods.controller";
import { TaxPeriodsService } from "./tax-periods.service";
import { AuditModule } from "../audit/audit.module";
import { ComplianceModule } from "../compliance/compliance.module";

@Module({
  imports: [AuditModule, ComplianceModule],
  controllers: [TaxPeriodsController],
  providers: [TaxPeriodsService],
  exports: [TaxPeriodsService],
})
export class TaxPeriodsModule {}
