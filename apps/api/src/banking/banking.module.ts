import { Module } from "@nestjs/common";
import { BankingController } from "./banking.controller";
import { BankingService } from "./banking.service";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AccountingModule, AuditModule],
  controllers: [BankingController],
  providers: [BankingService],
})
export class BankingModule {}
