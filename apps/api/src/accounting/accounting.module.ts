import { Module } from "@nestjs/common";
import { ChartOfAccountsController } from "./coa/coa.controller";
import { ChartOfAccountsService } from "./coa/coa.service";
import { FiscalController } from "./fiscal/fiscal.controller";
import { FiscalService } from "./fiscal/fiscal.service";
import { JournalsController } from "./journals/journals.controller";
import { JournalsService } from "./journals/journals.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [ChartOfAccountsController, FiscalController, JournalsController],
  providers: [ChartOfAccountsService, FiscalService, JournalsService],
  exports: [JournalsService],
})
export class AccountingModule {}
