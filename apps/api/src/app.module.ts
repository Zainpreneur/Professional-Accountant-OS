import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { CustomersModule } from "./customers/customers.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { AccountingModule } from "./accounting/accounting.module";
import { SalesModule } from "./sales/sales.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { PaymentsModule } from "./payments/payments.module";
import { ReportsModule } from "./reports/reports.module";
import { DocumentsModule } from "./documents/documents.module";
import { EmployeesModule } from "./employees/employees.module";
import { FixedAssetsModule } from "./fixed-assets/fixed-assets.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { PayrollModule } from "./payroll/payroll.module";
import { BankingModule } from "./banking/banking.module";
import { IntelligenceModule } from "./intelligence/intelligence.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CustomersModule,
    SuppliersModule,
    AccountingModule,
    SalesModule,
    PurchasesModule,
    PaymentsModule,
    ReportsModule,
    DocumentsModule,
    EmployeesModule,
    FixedAssetsModule,
    InventoryModule,
    ExpensesModule,
    PayrollModule,
    BankingModule,
    IntelligenceModule,
  ],
})
export class AppModule {}
