import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
