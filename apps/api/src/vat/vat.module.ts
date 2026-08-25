import { Module } from "@nestjs/common";
import { VatReturnsController } from "./vat-returns.controller";
import { VatReturnsService } from "./vat-returns.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [VatReturnsController],
  providers: [VatReturnsService],
})
export class VatModule {}
