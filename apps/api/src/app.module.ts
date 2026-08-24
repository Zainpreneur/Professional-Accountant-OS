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
  ],
})
export class AppModule {}
