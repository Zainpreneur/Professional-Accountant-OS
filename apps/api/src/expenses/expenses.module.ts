import { Module } from "@nestjs/common";
import { ExpenseClaimsController } from "./expense-claims.controller";
import { ExpenseClaimsService } from "./expense-claims.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [ExpenseClaimsController],
  providers: [ExpenseClaimsService],
})
export class ExpensesModule {}
