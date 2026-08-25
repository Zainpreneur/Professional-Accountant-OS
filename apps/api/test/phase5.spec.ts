import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException } from "@nestjs/common";
import { AuditService } from "../src/audit/audit.service";
import { JournalsService } from "../src/accounting/journals/journals.service";
import { ReportsService } from "../src/reports/reports.service";
import { ComplianceCalendarService } from "../src/compliance/compliance-calendar.service";
import { EngagementsService } from "../src/engagements/engagements.service";
import { AuditWorkService } from "../src/audit-work/audit-work.service";
import { AiWorkforceService } from "../src/ai-workforce/ai-workforce.service";
import {
  scanAccounting,
  scanAudit,
  scanCompliance,
  scanDocument,
  scanFinancialAnalyst,
  scanReconciliation,
  scanReporting,
  scanTax,
  type AgentContext,
} from "../src/ai-workforce/ai-workforce.agents";
import type { RequestUser } from "../src/common/types";

// Integration tests for Phase 5 (AI Workforce): each of the 8 MVP agents'
// scan logic against real fixture data (not mocked), plus
// AiWorkforceService's persistence/dedup, review queue grouping, and
// review workflow.
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const journals = new JournalsService(prisma as any, audit);
const reports = new ReportsService(prisma as any);
const compliance = new ComplianceCalendarService(prisma as any, audit);
const engagements = new EngagementsService(prisma as any, audit);
const auditWork = new AuditWorkService(prisma as any, audit);
const aiWorkforce = new AiWorkforceService(prisma as any, audit, reports, compliance);
const ctx: AgentContext = { prisma: prisma as any, reports, compliance };

let clientId: string;
let actor: RequestUser;
let accounts: Record<string, string>;

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);
  const firm = await prisma.firm.create({ data: { name: `P5 Test Firm ${suffix}` } });
  const user = await prisma.user.create({
    data: { firmId: firm.id, email: `p5-${suffix}@example.test`, passwordHash: "x", firstName: "T", lastName: "U", status: "ACTIVE" },
  });
  const client = await prisma.client.create({ data: { firmId: firm.id, legalName: `P5 Client ${suffix}`, jurisdiction: "SA-TEST" } });
  clientId = client.id;

  const specs: Array<[string, string, string, string]> = [
    ["bank", "1100", "ASSET", "DEBIT"],
    ["revenue", "4000", "REVENUE", "CREDIT"],
    ["expense", "5000", "EXPENSE", "DEBIT"],
    ["equity", "3000", "EQUITY", "CREDIT"],
  ];
  accounts = {};
  for (const [key, code, type, normalBalance] of specs) {
    const account = await prisma.chartOfAccount.create({
      data: { clientId, code, name: key, type: type as any, normalBalance: normalBalance as any },
    });
    accounts[key] = account.id;
  }

  const fiscalYear = await prisma.fiscalYear.create({
    data: { clientId, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
  });
  await prisma.accountingPeriod.create({
    data: { clientId, fiscalYearId: fiscalYear.id, name: "2026-01", startDate: new Date("2026-01-01"), endDate: new Date("2026-01-31") },
  });
  await prisma.accountingPeriod.create({
    data: { clientId, fiscalYearId: fiscalYear.id, name: "2026-02", startDate: new Date("2026-02-01"), endDate: new Date("2026-02-28") },
  });

  actor = {
    id: user.id,
    firmId: firm.id,
    email: user.email,
    firstName: "T",
    lastName: "U",
    firmWidePermissions: [],
    clientPermissions: {},
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await makeFixture();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeCurrentWindowPeriod() {
  // The shared fixture only covers Jan/Feb 2026 (Financial Analyst's
  // fixed comparison periods) - these tests need a period spanning "now",
  // wherever "now" actually falls, so add one scoped to just this test.
  const fiscalYear = await prisma.fiscalYear.findFirstOrThrow({ where: { clientId } });
  await prisma.accountingPeriod.create({
    data: { clientId, fiscalYearId: fiscalYear.id, name: "current-window", startDate: daysAgo(20), endDate: daysAgo(-20) },
  });
}

describe("Accounting Agent", () => {
  it("flags a draft journal that has sat unposted for more than 7 days", async () => {
    await makeCurrentWindowPeriod();
    await journals.createDraft(actor, clientId, {
      date: daysAgo(10).toISOString().slice(0, 10),
      description: "Old draft",
      lines: [
        { accountId: accounts.bank, debit: 100, credit: 0 },
        { accountId: accounts.equity, debit: 0, credit: 100 },
      ],
    });

    const findings = await scanAccounting(ctx, clientId);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("unposted for");
    expect(findings[0].entityType).toBe("Journal");
  });

  it("does not flag a recent draft or a posted journal", async () => {
    await makeCurrentWindowPeriod();
    await journals.createDraft(actor, clientId, {
      date: new Date().toISOString().slice(0, 10),
      description: "Fresh draft",
      lines: [
        { accountId: accounts.bank, debit: 50, credit: 0 },
        { accountId: accounts.equity, debit: 0, credit: 50 },
      ],
    });
    const old = await journals.createDraft(actor, clientId, {
      date: daysAgo(10).toISOString().slice(0, 10),
      description: "Old but posted",
      lines: [
        { accountId: accounts.bank, debit: 20, credit: 0 },
        { accountId: accounts.equity, debit: 0, credit: 20 },
      ],
    });
    await journals.post(actor, clientId, old.id);

    const findings = await scanAccounting(ctx, clientId);
    expect(findings).toHaveLength(0);
  });
});

describe("Tax Agent", () => {
  it("flags an active supplier with recent bill activity but no WHT category", async () => {
    const supplier = await prisma.supplier.create({ data: { clientId, code: "SUP-1", name: "Acme Services" } });
    await prisma.bill.create({
      data: { clientId, supplierId: supplier.id, billNumber: "B-1", date: daysAgo(5), dueDate: daysAgo(-25), subtotal: 1000, taxTotal: 150, total: 1150 },
    });

    const findings = await scanTax(ctx, clientId);
    expect(findings).toHaveLength(1);
    expect(findings[0].entityId).toBe(supplier.id);
  });

  it("does not flag a supplier that already has a WHT category", async () => {
    const supplier = await prisma.supplier.create({ data: { clientId, code: "SUP-2", name: "Categorized Co", whtCategoryCode: "SERVICES" } });
    await prisma.bill.create({
      data: { clientId, supplierId: supplier.id, billNumber: "B-2", date: daysAgo(5), dueDate: daysAgo(-25), subtotal: 1000, taxTotal: 150, total: 1150 },
    });

    const findings = await scanTax(ctx, clientId);
    expect(findings).toHaveLength(0);
  });
});

describe("Audit Agent", () => {
  it("flags a significant risk with no linked procedure, and any open finding", async () => {
    const created = await engagements.create(actor, clientId, { serviceType: "AUDIT", periodStart: "2026-01-01", periodEnd: "2026-12-31" });
    await engagements.setAcceptance(actor, clientId, created.id, true);

    await auditWork.createRisk(actor, clientId, created.id, {
      description: "Revenue cutoff risk",
      category: "INHERENT",
      likelihood: "HIGH",
      impact: "HIGH",
      isSignificant: true,
    });
    await auditWork.createFinding(actor, clientId, created.id, {
      type: "EXCEPTION",
      description: "Unreconciled variance",
      severity: "MEDIUM",
    });

    const findings = await scanAudit(ctx, clientId);
    expect(findings.some((f) => f.entityType === "AuditRisk")).toBe(true);
    expect(findings.some((f) => f.entityType === "AuditFinding" && f.reviewSeverity === "CA_REVIEW")).toBe(true);
  });

  it("does not flag a significant risk once it has a procedure", async () => {
    const created = await engagements.create(actor, clientId, { serviceType: "AUDIT", periodStart: "2026-01-01", periodEnd: "2026-12-31" });
    await engagements.setAcceptance(actor, clientId, created.id, true);

    const risk = await auditWork.createRisk(actor, clientId, created.id, {
      description: "Revenue cutoff risk",
      category: "INHERENT",
      likelihood: "HIGH",
      impact: "HIGH",
      isSignificant: true,
    });
    await auditWork.createProcedure(actor, clientId, created.id, {
      riskId: risk.id,
      assertion: "CUTOFF",
      procedureType: "SUBSTANTIVE_TEST",
      description: "Test cutoff sample",
    });

    const findings = await scanAudit(ctx, clientId);
    expect(findings.some((f) => f.entityType === "AuditRisk")).toBe(false);
  });
});

describe("Reconciliation Agent", () => {
  it("flags an unmatched bank statement line older than 14 days", async () => {
    const bankImport = await prisma.bankStatementImport.create({
      data: { clientId, bankAccountId: accounts.bank, fileName: "stmt.csv", importedById: actor.id },
    });
    await prisma.bankStatementLine.create({
      data: { importId: bankImport.id, date: daysAgo(20), description: "Unknown deposit", amount: 500 },
    });

    const findings = await scanReconciliation(ctx, clientId);
    expect(findings).toHaveLength(1);
    expect(findings[0].entityType).toBe("BankStatementLine");
  });

  it("does not flag a recently-imported unmatched line", async () => {
    const bankImport = await prisma.bankStatementImport.create({
      data: { clientId, bankAccountId: accounts.bank, fileName: "stmt.csv", importedById: actor.id },
    });
    await prisma.bankStatementLine.create({
      data: { importId: bankImport.id, date: daysAgo(2), description: "Recent deposit", amount: 500 },
    });

    const findings = await scanReconciliation(ctx, clientId);
    expect(findings).toHaveLength(0);
  });
});

describe("Reporting Agent", () => {
  it("flags an OPEN accounting period past its end date", async () => {
    const findings = await scanReporting(ctx, clientId);
    // Both fixture periods (2026-01, 2026-02) are in the past relative to "today".
    expect(findings.filter((f) => f.entityType === "AccountingPeriod")).toHaveLength(2);
  });

  it("flags an out-of-balance trial balance", async () => {
    const journal = await prisma.journal.create({
      data: {
        clientId,
        journalNumber: "CORRUPT-1",
        date: new Date("2026-01-15"),
        periodId: (await prisma.accountingPeriod.findFirstOrThrow({ where: { clientId, name: "2026-01" } })).id,
        status: "POSTED",
        createdById: actor.id,
        postedById: actor.id,
        postedAt: new Date(),
        lines: { create: [{ accountId: accounts.bank, debit: 500, credit: 0, lineNumber: 1 }] },
      },
    });
    expect(journal.id).toBeTruthy();

    const findings = await scanReporting(ctx, clientId);
    expect(findings.some((f) => f.title === "Trial balance is out of balance")).toBe(true);
  });
});

describe("Document Agent", () => {
  it("flags a failed extraction and a low-confidence extraction", async () => {
    const firm = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    const failedDoc = await prisma.document.create({
      data: { firmId: firm.firmId, clientId, uploadedById: actor.id, fileName: "scan.jpg", mimeType: "image/jpeg", sizeBytes: 100, storageKey: "k1" },
    });
    await prisma.documentExtraction.create({ data: { documentId: failedDoc.id, status: "FAILED", confidence: 0 } });

    const lowConfDoc = await prisma.document.create({
      data: { firmId: firm.firmId, clientId, uploadedById: actor.id, fileName: "invoice.pdf", mimeType: "application/pdf", sizeBytes: 200, storageKey: "k2" },
    });
    await prisma.documentExtraction.create({ data: { documentId: lowConfDoc.id, status: "COMPLETED", confidence: 0.3 } });

    const goodDoc = await prisma.document.create({
      data: { firmId: firm.firmId, clientId, uploadedById: actor.id, fileName: "clean.pdf", mimeType: "application/pdf", sizeBytes: 200, storageKey: "k3" },
    });
    await prisma.documentExtraction.create({ data: { documentId: goodDoc.id, status: "COMPLETED", confidence: 0.9 } });

    const findings = await scanDocument(ctx, clientId);
    expect(findings).toHaveLength(2);
    expect(findings.some((f) => f.reviewSeverity === "CLIENT_CLARIFICATION")).toBe(true);
    expect(findings.some((f) => f.reviewSeverity === "ACCOUNTANT_REVIEW")).toBe(true);
  });
});

describe("Compliance Agent", () => {
  it("flags an overdue compliance deadline", async () => {
    await prisma.complianceDeadline.create({ data: { clientId, category: "CUSTOM", title: "CR Renewal", dueDate: daysAgo(5) } });

    const findings = await scanCompliance(ctx, clientId);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("Overdue");
    expect(findings[0].reviewSeverity).toBe("CA_REVIEW");
  });
});

describe("Financial Analyst Agent", () => {
  it("flags a >=25% period-over-period revenue swing", async () => {
    const jan = await journals.createDraft(actor, clientId, {
      date: "2026-01-10",
      description: "January sale",
      lines: [
        { accountId: accounts.bank, debit: 1000, credit: 0 },
        { accountId: accounts.revenue, debit: 0, credit: 1000 },
      ],
    });
    await journals.post(actor, clientId, jan.id);

    const feb = await journals.createDraft(actor, clientId, {
      date: "2026-02-10",
      description: "February sale",
      lines: [
        { accountId: accounts.bank, debit: 1600, credit: 0 },
        { accountId: accounts.revenue, debit: 0, credit: 1600 },
      ],
    });
    await journals.post(actor, clientId, feb.id);

    const findings = await scanFinancialAnalyst(ctx, clientId);
    const revenueFinding = findings.find((f) => f.title.startsWith("Revenue"));
    expect(revenueFinding).toBeDefined();
    expect(revenueFinding!.title).toContain("+60.0%");
  });

  it("does not flag a stable period-over-period revenue figure", async () => {
    for (const date of ["2026-01-10", "2026-02-10"]) {
      const journal = await journals.createDraft(actor, clientId, {
        date,
        description: "Steady sale",
        lines: [
          { accountId: accounts.bank, debit: 1000, credit: 0 },
          { accountId: accounts.revenue, debit: 0, credit: 1000 },
        ],
      });
      await journals.post(actor, clientId, journal.id);
    }

    const findings = await scanFinancialAnalyst(ctx, clientId);
    expect(findings.filter((f) => f.title.startsWith("Revenue"))).toHaveLength(0);
  });
});

describe("AiWorkforceService", () => {
  it("persists findings from a scan and skips duplicates on re-run", async () => {
    await prisma.complianceDeadline.create({ data: { clientId, category: "CUSTOM", title: "GOSI filing", dueDate: daysAgo(3) } });

    const first = await aiWorkforce.runAgent(actor, clientId, "COMPLIANCE");
    expect(first.findingsCreated).toHaveLength(1);

    const second = await aiWorkforce.runAgent(actor, clientId, "COMPLIANCE");
    expect(second.findingsScanned).toBe(1);
    expect(second.findingsCreated).toHaveLength(0);
  });

  it("rejects an unknown agent type", async () => {
    await expect(aiWorkforce.runAgent(actor, clientId, "NOT_REAL")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("runAll runs every one of the 8 MVP agents", async () => {
    const results = await aiWorkforce.runAll(actor, clientId);
    expect(Object.keys(results).sort()).toEqual(
      ["ACCOUNTING", "AUDIT", "COMPLIANCE", "DOCUMENT", "FINANCIAL_ANALYST", "RECONCILIATION", "REPORTING", "TAX"].sort(),
    );
  });

  it("groups the open queue by review severity", async () => {
    await prisma.complianceDeadline.create({ data: { clientId, category: "CUSTOM", title: "Overdue filing", dueDate: daysAgo(1) } });
    await aiWorkforce.runAgent(actor, clientId, "COMPLIANCE");

    const { bySeverity, severityOrder } = await aiWorkforce.queue(clientId);
    expect(severityOrder).toContain("CA_REVIEW");
    expect(bySeverity.CA_REVIEW).toHaveLength(1);
  });

  it("records a review decision and rejects reviewing the same finding twice", async () => {
    await prisma.complianceDeadline.create({ data: { clientId, category: "CUSTOM", title: "Overdue filing", dueDate: daysAgo(1) } });
    const { findingsCreated } = await aiWorkforce.runAgent(actor, clientId, "COMPLIANCE");
    const runId = findingsCreated[0]!.id;

    const reviewed = await aiWorkforce.review(actor, clientId, runId, { decision: "APPROVED", notes: "Filing now" });
    expect(reviewed.status).toBe("REVIEWED");
    expect(reviewed.reviewedById).toBe(actor.id);
    expect(reviewed.reviewDecision).toBe("APPROVED");

    await expect(aiWorkforce.review(actor, clientId, runId, { decision: "APPROVED" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
