import { Module } from "@nestjs/common";
import { WhtController } from "./wht.controller";
import { WhtService } from "./wht.service";
import { AuditModule } from "../audit/audit.module";
import { RegulatoryRulesModule } from "../regulatory-rules/regulatory-rules.module";

@Module({
  imports: [AuditModule, RegulatoryRulesModule],
  controllers: [WhtController],
  providers: [WhtService],
})
export class WhtModule {}
