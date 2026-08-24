import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class SalesModule {}
