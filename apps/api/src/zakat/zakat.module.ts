import { Module } from "@nestjs/common";
import { ZakatController } from "./zakat.controller";
import { ZakatService } from "./zakat.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";
import { RegulatoryRulesModule } from "../regulatory-rules/regulatory-rules.module";

@Module({
  imports: [AccountingModule, AuditModule, RegulatoryRulesModule],
  controllers: [ZakatController],
  providers: [ZakatService],
})
export class ZakatModule {}
