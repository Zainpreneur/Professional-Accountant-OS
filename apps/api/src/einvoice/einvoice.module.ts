import { Module } from "@nestjs/common";
import { EInvoiceController } from "./einvoice.controller";
import { EInvoiceService } from "./einvoice.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [EInvoiceController],
  providers: [EInvoiceService],
})
export class EInvoiceModule {}
