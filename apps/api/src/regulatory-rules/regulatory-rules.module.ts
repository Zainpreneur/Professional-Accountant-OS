import { Module } from "@nestjs/common";
import { RegulatoryRulesController } from "./regulatory-rules.controller";
import { RegulatoryRulesService } from "./regulatory-rules.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [RegulatoryRulesController],
  providers: [RegulatoryRulesService],
  exports: [RegulatoryRulesService],
})
export class RegulatoryRulesModule {}
