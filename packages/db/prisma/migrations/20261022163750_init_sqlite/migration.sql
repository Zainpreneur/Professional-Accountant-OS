-- CreateTable
CREATE TABLE "firms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "country" TEXT NOT NULL DEFAULT 'SA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "entityType" TEXT,
    "businessCategory" TEXT,
    "jurisdiction" TEXT NOT NULL DEFAULT 'SA',
    "taxRegistrationNumber" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'SAR',
    "status" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "clients_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_members_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engagements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "acceptanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "materialityAmount" DECIMAL,
    "materialityBasis" TEXT,
    "scope" TEXT,
    "independenceStatus" TEXT,
    "createdById" TEXT NOT NULL,
    "conclusionText" TEXT,
    "concludedById" TEXT,
    "concludedAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "engagements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "engagements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "engagements_concludedById_fkey" FOREIGN KEY ("concludedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "engagements_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engagement_team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engagement_team_members_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "engagement_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "independence_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "hasFinancialInterest" BOOLEAN NOT NULL DEFAULT false,
    "hasCloseRelationship" BOOLEAN NOT NULL DEFAULT false,
    "hasPriorEngagementConflict" BOOLEAN NOT NULL DEFAULT false,
    "hasProhibitedActivity" BOOLEAN NOT NULL DEFAULT false,
    "selfReviewThreat" BOOLEAN NOT NULL DEFAULT false,
    "familiarityThreat" BOOLEAN NOT NULL DEFAULT false,
    "advocacyThreat" BOOLEAN NOT NULL DEFAULT false,
    "managementParticipationThreat" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "checkedById" TEXT NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT 'PENDING',
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "independence_checks_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "independence_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "independence_checks_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_risks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assertion" TEXT,
    "likelihood" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "isSignificant" BOOLEAN NOT NULL DEFAULT false,
    "response" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_risks_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_risks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_procedures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "riskId" TEXT,
    "assertion" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sampleSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "performedById" TEXT,
    "performedAt" DATETIME,
    "conclusion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_procedures_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_procedures_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "audit_risks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_procedures_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "procedureId" TEXT,
    "findingId" TEXT,
    "documentId" TEXT,
    "description" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "obtainedById" TEXT NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_evidence_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_evidence_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "audit_procedures" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "audit_findings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_evidence_obtainedById_fkey" FOREIGN KEY ("obtainedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "procedureId" TEXT,
    "riskId" TEXT,
    "type" TEXT NOT NULL,
    "assertion" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL,
    "severity" TEXT NOT NULL,
    "recommendation" TEXT,
    "managementResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "audit_findings_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_findings_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "audit_procedures" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_findings_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "audit_risks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_findings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engagement_completion_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedById" TEXT,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engagement_completion_items_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "engagement_completion_items_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "professional_judgment_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "engagementId" TEXT,
    "question" TEXT NOT NULL,
    "facts" TEXT NOT NULL,
    "applicableStandards" TEXT,
    "possibleTreatments" TEXT,
    "recommendation" TEXT,
    "risk" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_judgment_cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "professional_judgment_cases_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "professional_judgment_cases_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "professional_judgment_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "professional_judgment_cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "parentId" TEXT,
    "normalBalance" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
    "controlAccountType" TEXT,
    "reconciliationRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chart_of_accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "fiscal_years_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "accounting_periods_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounting_periods_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "journalNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "periodId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "postedById" TEXT,
    "postedAt" DATETIME,
    "reversalOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journals_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "journals_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "journals_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "journal_lines_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "creditLimit" DECIMAL,
    "arAccountId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customers_arAccountId_fkey" FOREIGN KEY ("arAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "apAccountId" TEXT,
    "whtCategoryCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "suppliers_apAccountId_fkey" FOREIGN KEY ("apAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL,
    "revenueAccountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoice_lines_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bills_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bills_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bills_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    CONSTRAINT "bill_lines_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bill_lines_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whtAmount" DECIMAL NOT NULL DEFAULT 0,
    "whtCategoryCode" TEXT,
    "whtPayableAccountId" TEXT,
    CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_whtPayableAccountId_fkey" FOREIGN KEY ("whtPayableAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "billId" TEXT,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payment_allocations_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "jobTitle" TEXT,
    "hireDate" DATETIME NOT NULL,
    "terminationDate" DATETIME,
    "baseSalary" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employees_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "acquisitionDate" DATETIME NOT NULL,
    "acquisitionCost" DECIMAL NOT NULL,
    "salvageValue" DECIMAL NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "accumulatedDepreciation" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assetAccountId" TEXT NOT NULL,
    "depreciationExpenseAccountId" TEXT NOT NULL,
    "accumulatedDepreciationAccountId" TEXT NOT NULL,
    "acquisitionJournalId" TEXT,
    "disposalDate" DATETIME,
    "disposalProceeds" DECIMAL,
    "disposalJournalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fixed_assets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_assetAccountId_fkey" FOREIGN KEY ("assetAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_depreciationExpenseAccountId_fkey" FOREIGN KEY ("depreciationExpenseAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_accumulatedDepreciationAccountId_fkey" FOREIGN KEY ("accumulatedDepreciationAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_acquisitionJournalId_fkey" FOREIGN KEY ("acquisitionJournalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_disposalJournalId_fkey" FOREIGN KEY ("disposalJournalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "depreciation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "runDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "depreciation_runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "depreciation_runs_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "depreciation_entries_runId_fkey" FOREIGN KEY ("runId") REFERENCES "depreciation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'unit',
    "inventoryAccountId" TEXT NOT NULL,
    "cogsAccountId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_inventoryAccountId_fkey" FOREIGN KEY ("inventoryAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "products_cogsAccountId_fkey" FOREIGN KEY ("cogsAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "warehouses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL NOT NULL DEFAULT 0,
    "averageCost" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "product_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "reference" TEXT,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentAccountId" TEXT,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_claims_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "expense_claims_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expense_claims_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expense_claims_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_claim_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "categoryAccountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    CONSTRAINT "expense_claim_lines_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "expense_claims" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "expense_claim_lines_categoryAccountId_fkey" FOREIGN KEY ("categoryAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "payDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL NOT NULL DEFAULT 0,
    "totalNet" DECIMAL NOT NULL DEFAULT 0,
    "journalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payroll_runs_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DECIMAL NOT NULL,
    "allowances" DECIMAL NOT NULL DEFAULT 0,
    "deductions" DECIMAL NOT NULL DEFAULT 0,
    "grossPay" DECIMAL NOT NULL,
    "netPay" DECIMAL NOT NULL,
    CONSTRAINT "payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_statement_imports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_statement_imports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_statement_imports_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bank_statement_imports_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "matchedJournalLineId" TEXT,
    CONSTRAINT "bank_statement_lines_importId_fkey" FOREIGN KEY ("importId") REFERENCES "bank_statement_imports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_statement_lines_matchedJournalLineId_fkey" FOREIGN KEY ("matchedJournalLineId") REFERENCES "journal_lines" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementDate" DATETIME NOT NULL,
    "statementEndingBalance" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completedById" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_reconciliations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_extractions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "fields" TEXT,
    "confidence" DECIMAL,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_extractions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regulatory_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdiction" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_periods_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vat_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "outputVat" DECIMAL NOT NULL DEFAULT 0,
    "inputVat" DECIMAL NOT NULL DEFAULT 0,
    "netVatDue" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payableAccountId" TEXT,
    "journalId" TEXT,
    "filedById" TEXT,
    "filedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vat_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vat_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vat_returns_payableAccountId_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vat_returns_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wht_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "totalWht" DECIMAL NOT NULL DEFAULT 0,
    "breakdown" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "filedById" TEXT,
    "filedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wht_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wht_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zakat_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "equityAmount" DECIMAL NOT NULL DEFAULT 0,
    "netFixedAssetsAmount" DECIMAL NOT NULL DEFAULT 0,
    "additionsTotal" DECIMAL NOT NULL DEFAULT 0,
    "deductionsTotal" DECIMAL NOT NULL DEFAULT 0,
    "zakatBase" DECIMAL NOT NULL DEFAULT 0,
    "zakatRate" DECIMAL NOT NULL DEFAULT 0,
    "zakatDue" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expenseAccountId" TEXT,
    "payableAccountId" TEXT,
    "journalId" TEXT,
    "filedById" TEXT,
    "filedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zakat_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zakat_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zakat_returns_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "zakat_returns_payableAccountId_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "zakat_returns_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zakat_adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zakatReturnId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zakat_adjustments_zakatReturnId_fkey" FOREIGN KEY ("zakatReturnId") REFERENCES "zakat_returns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "einvoice_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "qrPayloadBase64" TEXT NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "einvoice_records_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_deadlines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "notes" TEXT,
    "completedById" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_deadlines_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_agent_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "dataCompleteness" INTEGER NOT NULL,
    "evidenceQuality" TEXT NOT NULL,
    "ruleCertainty" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "materiality" DECIMAL,
    "recommendedAction" TEXT NOT NULL,
    "reviewSeverity" TEXT NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewDecision" TEXT,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_agent_runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_agent_runs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firmId_email_key" ON "users"("firmId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_firmId_name_key" ON "roles"("firmId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_clientId_key" ON "user_roles"("userId", "roleId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_firmId_legalName_key" ON "clients"("firmId", "legalName");

-- CreateIndex
CREATE UNIQUE INDEX "client_members_clientId_userId_key" ON "client_members"("clientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_team_members_engagementId_userId_key" ON "engagement_team_members"("engagementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_completion_items_engagementId_item_key" ON "engagement_completion_items"("engagementId", "item");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_clientId_code_key" ON "chart_of_accounts"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_clientId_name_key" ON "fiscal_years"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_clientId_name_key" ON "accounting_periods"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "journals_clientId_journalNumber_key" ON "journals"("clientId", "journalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customers_clientId_code_key" ON "customers"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_clientId_code_key" ON "suppliers"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_journalId_key" ON "invoices"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_clientId_invoiceNumber_key" ON "invoices"("clientId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bills_journalId_key" ON "bills"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_clientId_billNumber_key" ON "bills"("clientId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_journalId_key" ON "payments"("journalId");

-- CreateIndex
CREATE INDEX "audit_logs_firmId_entityType_entityId_idx" ON "audit_logs"("firmId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_clientId_employeeCode_key" ON "employees"("clientId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_acquisitionJournalId_key" ON "fixed_assets"("acquisitionJournalId");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_disposalJournalId_key" ON "fixed_assets"("disposalJournalId");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_clientId_assetCode_key" ON "fixed_assets"("clientId", "assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_journalId_key" ON "depreciation_runs"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_clientId_periodLabel_key" ON "depreciation_runs"("clientId", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_runId_assetId_key" ON "depreciation_entries"("runId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "products_clientId_sku_key" ON "products"("clientId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_clientId_code_key" ON "warehouses"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "product_stock_productId_warehouseId_key" ON "product_stock"("productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_journalId_key" ON "stock_movements"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_journalId_key" ON "expense_claims"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_clientId_claimNumber_key" ON "expense_claims"("clientId", "claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_journalId_key" ON "payroll_runs"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_clientId_periodLabel_key" ON "payroll_runs"("clientId", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payrollRunId_employeeId_key" ON "payslips"("payrollRunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_statement_lines_matchedJournalLineId_key" ON "bank_statement_lines"("matchedJournalLineId");

-- CreateIndex
CREATE UNIQUE INDEX "document_extractions_documentId_key" ON "document_extractions"("documentId");

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

-- CreateIndex
CREATE INDEX "ai_agent_runs_clientId_status_idx" ON "ai_agent_runs"("clientId", "status");

-- CreateIndex
CREATE INDEX "ai_agent_runs_clientId_agentType_idx" ON "ai_agent_runs"("clientId", "agentType");
