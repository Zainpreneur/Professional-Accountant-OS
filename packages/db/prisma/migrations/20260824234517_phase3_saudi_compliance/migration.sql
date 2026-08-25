-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('VAT_RATE', 'WHT_RATE', 'ZAKAT_RATE');

-- CreateEnum
CREATE TYPE "TaxPeriodType" AS ENUM ('VAT', 'WHT', 'ZAKAT');

-- CreateEnum
CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT', 'FILED');

-- CreateEnum
CREATE TYPE "ZakatAdjustmentType" AS ENUM ('ADDITION', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "ComplianceDeadlineStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "whtCategoryCode" TEXT,
ADD COLUMN     "whtPayableAccountId" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "whtCategoryCode" TEXT;

-- CreateTable
CREATE TABLE "regulatory_rules" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL(7,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodType" "TaxPeriodType" NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_returns" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "outputVat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inputVat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netVatDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "payableAccountId" TEXT,
    "journalId" TEXT,
    "filedById" TEXT,
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wht_returns" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "totalWht" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "filedById" TEXT,
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wht_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zakat_returns" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "equityAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netFixedAssetsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "additionsTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deductionsTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "zakatBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "zakatRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "zakatDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "expenseAccountId" TEXT,
    "payableAccountId" TEXT,
    "journalId" TEXT,
    "filedById" TEXT,
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zakat_adjustments" (
    "id" TEXT NOT NULL,
    "zakatReturnId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ZakatAdjustmentType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einvoice_records" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "qrPayloadBase64" TEXT NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "einvoice_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_deadlines" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ComplianceDeadlineStatus" NOT NULL DEFAULT 'PENDING',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "notes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regulatory_rules_jurisdiction_ruleType_code_effectiveFrom_idx" ON "regulatory_rules"("jurisdiction", "ruleType", "code", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_clientId_periodType_name_key" ON "tax_periods"("clientId", "periodType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "vat_returns_journalId_key" ON "vat_returns"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_returns_taxPeriodId_key" ON "vat_returns"("taxPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "wht_returns_taxPeriodId_key" ON "wht_returns"("taxPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "zakat_returns_journalId_key" ON "zakat_returns"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "zakat_returns_taxPeriodId_key" ON "zakat_returns"("taxPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "einvoice_records_invoiceId_key" ON "einvoice_records"("invoiceId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_whtPayableAccountId_fkey" FOREIGN KEY ("whtPayableAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_payableAccountId_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wht_returns" ADD CONSTRAINT "wht_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wht_returns" ADD CONSTRAINT "wht_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_returns" ADD CONSTRAINT "zakat_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_returns" ADD CONSTRAINT "zakat_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_returns" ADD CONSTRAINT "zakat_returns_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_returns" ADD CONSTRAINT "zakat_returns_payableAccountId_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_returns" ADD CONSTRAINT "zakat_returns_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat_adjustments" ADD CONSTRAINT "zakat_adjustments_zakatReturnId_fkey" FOREIGN KEY ("zakatReturnId") REFERENCES "zakat_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einvoice_records" ADD CONSTRAINT "einvoice_records_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_deadlines" ADD CONSTRAINT "compliance_deadlines_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
