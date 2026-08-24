import { Module } from "@nestjs/common";
import { BillsController } from "./bills.controller";
import { BillsService } from "./bills.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [BillsController],
  providers: [BillsService],
})
export class PurchasesModule {}
