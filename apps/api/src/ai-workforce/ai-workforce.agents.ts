import type { PrismaService } from "../prisma/prisma.service";
import type { ReportsService } from "../reports/reports.service";
import type { ComplianceCalendarService } from "../compliance/compliance-calendar.service";

// The 8 MVP agents (SRS 98 Phase 5, a subset of SRS 37's 20-agent full
// roster). Each scan function is the OBSERVE -> UNDERSTAND -> RETRIEVE ->
// CALCULATE -> VALIDATE step of SRS 38's operating model, expressed as a
// plain read-only query over this client's real data - never a fabricated
// or LLM-generated finding (there's no LLM API wired into this app
// process; see docs/ARCHITECTURE.md). RECOMMEND/ESCALATE IF REQUIRED is
// `recommendedAction`/`reviewSeverity` below; EXECUTE IF AUTHORIZED never
// happens automatically in this build (SRS 4) - AiWorkforceService just
// persists the finding (RECORD EVIDENCE) for a human to act on via
// review() or via the underlying module itself (Journals, Banking, ...).

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RecommendedAction = "NO_ACTION_NEEDED" | "ESCALATE_TO_REVIEW" | "AUTO_POST_PERMITTED";
export type ReviewSeverity = "PROFESSIONAL_JUDGMENT" | "CA_REVIEW" | "ACCOUNTANT_REVIEW" | "CLIENT_CLARIFICATION" | "AUTO_VALIDATED";

export interface FindingInput {
  entityType?: string;
  entityId?: string;
  title: string;
  observation: string;
  reasoning: string;
  confidence: number;
  dataCompleteness: number;
  evidenceQuality: string;
  ruleCertainty: string;
  risk: RiskLevel;
  materiality?: number;
  recommendedAction: RecommendedAction;
  reviewSeverity: ReviewSeverity;
}

export interface AgentContext {
  prisma: PrismaService;
  reports: ReportsService;
  compliance: ComplianceCalendarService;
}

const ACTIVE_JOURNAL_STATUSES = ["POSTED", "REVERSED"] as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function ageInDays(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

// --- Accounting Agent --------------------------------------------------
// Flags draft journals that have sat unposted for a while - the kind of
// thing that gets forgotten and either never posted or duplicated by a
// later entry covering the same activity.
export async function scanAccounting({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const staleDrafts = await prisma.journal.findMany({
    where: { clientId, status: "DRAFT", date: { lte: daysAgo(7) } },
    include: { lines: true },
    orderBy: { date: "asc" },
    take: 50,
  });

  return staleDrafts.map((j) => {
    const age = ageInDays(j.date);
    const total = j.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const risk: RiskLevel = age > 30 ? "HIGH" : age > 14 ? "MEDIUM" : "LOW";
    return {
      entityType: "Journal",
      entityId: j.id,
      title: `Draft journal ${j.journalNumber} unposted for ${age} days`,
      observation: `Journal ${j.journalNumber} dated ${j.date.toISOString().slice(0, 10)} has ${j.lines.length} line(s) totalling ${total.toFixed(2)} and is still in DRAFT status.`,
      reasoning: `A draft journal untouched for more than 7 days risks being forgotten, or duplicated by a later entry covering the same activity. Age threshold: 7 days; this journal is ${age} days old.`,
      confidence: 95,
      dataCompleteness: 100,
      evidenceQuality: "Direct read of the journal and its lines",
      ruleCertainty: "Deterministic age threshold",
      risk,
      materiality: total,
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "ACCOUNTANT_REVIEW",
    };
  });
}

// --- Tax Agent -----------------------------------------------------------
// Flags active suppliers with recent purchase activity but no WHT category
// assigned - a data-completeness gap that would otherwise only surface
// when someone tries to calculate withholding at payment time (SRS 28).
export async function scanTax({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const suppliers = await prisma.supplier.findMany({
    where: {
      clientId,
      active: true,
      whtCategoryCode: null,
      bills: { some: { date: { gte: daysAgo(90) } } },
    },
    include: { bills: { where: { date: { gte: daysAgo(90) } }, orderBy: { date: "desc" }, take: 1 } },
  });

  return suppliers
    .filter((s) => s.bills.length > 0)
    .map((s) => {
      const lastBill = s.bills[0];
      return {
        entityType: "Supplier",
        entityId: s.id,
        title: `Supplier ${s.code} has no WHT category despite recent activity`,
        observation: `Supplier ${s.code} (${s.name}) has a bill dated ${lastBill.date.toISOString().slice(0, 10)} (${lastBill.billNumber}) within the last 90 days, but whtCategoryCode is not set.`,
        reasoning: "Withholding tax cannot be calculated or withheld at payment time without a WHT category on the supplier - flagging before the next payment, not after.",
        confidence: 90,
        dataCompleteness: 100,
        evidenceQuality: `Most recent bill: ${lastBill.billNumber}`,
        ruleCertainty: "Deterministic data-completeness check",
        risk: "MEDIUM",
        recommendedAction: "ESCALATE_TO_REVIEW",
        reviewSeverity: "ACCOUNTANT_REVIEW",
      };
    });
}

// --- Audit Agent -----------------------------------------------------------
// Flags significant risks with no procedure addressing them yet, and open
// findings, on every in-progress engagement for this client.
export async function scanAudit({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const engagements = await prisma.engagement.findMany({
    where: { clientId, status: "IN_PROGRESS" },
    include: { risks: true, findings: true },
  });

  const findings: FindingInput[] = [];
  for (const engagement of engagements) {
    for (const risk of engagement.risks.filter((r) => r.isSignificant)) {
      const procedureCount = await prisma.auditProcedure.count({ where: { riskId: risk.id } });
      if (procedureCount > 0) continue;
      findings.push({
        entityType: "AuditRisk",
        entityId: risk.id,
        title: `Significant risk has no procedure: "${risk.description.slice(0, 60)}"`,
        observation: `Engagement risk "${risk.description}" (${risk.category}, likelihood ${risk.likelihood}/impact ${risk.impact}) is flagged significant but has 0 linked procedures.`,
        reasoning: "A significant risk with no responding procedure is an audit-methodology gap - every significant risk should drive at least one procedure (SRS 34).",
        confidence: 100,
        dataCompleteness: 100,
        evidenceQuality: "Direct count of AuditProcedure rows linked to this risk",
        ruleCertainty: "Deterministic relational check",
        risk: "HIGH",
        recommendedAction: "ESCALATE_TO_REVIEW",
        reviewSeverity: "PROFESSIONAL_JUDGMENT",
      });
    }

    for (const finding of engagement.findings.filter((f) => f.status === "OPEN")) {
      findings.push({
        entityType: "AuditFinding",
        entityId: finding.id,
        title: `Open ${finding.severity.toLowerCase()} finding: "${finding.description.slice(0, 60)}"`,
        observation: `Finding "${finding.description}" (${finding.type}, severity ${finding.severity}${finding.amount ? `, amount ${Number(finding.amount).toFixed(2)}` : ""}) is still OPEN.`,
        reasoning: "Open findings need a resolution (RESOLVED) or an explicit acceptance (ACCEPTED) before the engagement can conclude (SRS 33).",
        confidence: 100,
        dataCompleteness: 100,
        evidenceQuality: "Direct read of the AuditFinding record",
        ruleCertainty: "Deterministic status check",
        risk: finding.severity as RiskLevel,
        materiality: finding.amount ? Number(finding.amount) : undefined,
        recommendedAction: "ESCALATE_TO_REVIEW",
        reviewSeverity: finding.severity === "HIGH" ? "PROFESSIONAL_JUDGMENT" : finding.severity === "MEDIUM" ? "CA_REVIEW" : "ACCOUNTANT_REVIEW",
      });
    }
  }
  return findings;
}

// --- Reconciliation Agent --------------------------------------------------
// Flags bank statement lines that have sat UNMATCHED for a while.
export async function scanReconciliation({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const staleLines = await prisma.bankStatementLine.findMany({
    where: { status: "UNMATCHED", import: { clientId }, date: { lte: daysAgo(14) } },
    include: { import: { include: { bankAccount: true } } },
    orderBy: { date: "asc" },
    take: 50,
  });

  return staleLines.map((line) => {
    const age = ageInDays(line.date);
    const amount = Number(line.amount);
    const risk: RiskLevel = Math.abs(amount) >= 10_000 ? "HIGH" : age > 30 ? "MEDIUM" : "LOW";
    return {
      entityType: "BankStatementLine",
      entityId: line.id,
      title: `Unmatched bank line on ${line.import.bankAccount.name}, ${age} days old`,
      observation: `Statement line dated ${line.date.toISOString().slice(0, 10)} ("${line.description}", amount ${amount.toFixed(2)}) on account ${line.import.bankAccount.code} is still UNMATCHED.`,
      reasoning: `An unmatched bank line older than 14 days either has no corresponding journal entry yet, or the matching journal entry was recorded with a different amount/date than the bank shows it. Age threshold: 14 days; this line is ${age} days old.`,
      confidence: 90,
      dataCompleteness: 100,
      evidenceQuality: "Direct read of the imported statement line",
      ruleCertainty: "Deterministic age + amount threshold",
      risk,
      materiality: Math.abs(amount),
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: risk === "HIGH" ? "CA_REVIEW" : "ACCOUNTANT_REVIEW",
    };
  });
}

// --- Reporting Agent ---------------------------------------------------
// Flags accounting periods that should have been closed by now, and (as a
// defensive live check, not something the ledger invariants should ever
// actually allow) an out-of-balance trial balance.
export async function scanReporting({ prisma, reports }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  const overduePeriods = await prisma.accountingPeriod.findMany({
    where: { clientId, status: "OPEN", endDate: { lt: new Date() } },
    orderBy: { endDate: "asc" },
    take: 50,
  });
  for (const period of overduePeriods) {
    const age = ageInDays(period.endDate);
    findings.push({
      entityType: "AccountingPeriod",
      entityId: period.id,
      title: `Period ${period.name} is still OPEN, ${age} days after it ended`,
      observation: `Accounting period ${period.name} ended ${period.endDate.toISOString().slice(0, 10)} but is still in OPEN status.`,
      reasoning: "An open period past its end date can still receive postings that belong to a period reports have already been generated for - closing it locks that in.",
      confidence: 95,
      dataCompleteness: 100,
      evidenceQuality: "Direct read of the AccountingPeriod record",
      ruleCertainty: "Deterministic date comparison",
      risk: age > 30 ? "HIGH" : "MEDIUM",
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "ACCOUNTANT_REVIEW",
    });
  }

  const tb = await reports.trialBalance(clientId, new Date().toISOString().slice(0, 10));
  if (!tb.balanced) {
    findings.push({
      title: "Trial balance is out of balance",
      observation: `As of today, total debits and total credits on the trial balance do not match (debits ${Number(tb.totalDebit).toFixed(2)}, credits ${Number(tb.totalCredit).toFixed(2)}).`,
      reasoning: "Every journal is required to balance at posting time - an out-of-balance trial balance would mean that invariant was violated somewhere, which needs investigation, not just a routine review.",
      confidence: 100,
      dataCompleteness: 100,
      evidenceQuality: "Live computation from posted journal lines",
      ruleCertainty: "Deterministic sum comparison",
      risk: "HIGH",
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "PROFESSIONAL_JUDGMENT",
    });
  }

  return findings;
}

// --- Document Agent --------------------------------------------------------
// Flags documents where field extraction failed outright, or completed
// with low confidence - both need a human to either re-supply a clearer
// document or key the fields in by hand (SRS 40).
export async function scanDocument({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const extractions = await prisma.documentExtraction.findMany({
    where: {
      document: { clientId },
      OR: [{ status: "FAILED" }, { status: "COMPLETED", confidence: { lt: 0.6 } }],
    },
    include: { document: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return extractions.map((ex) => {
    const failed = ex.status === "FAILED";
    const confidencePct = ex.confidence ? Math.round(Number(ex.confidence) * 100) : 0;
    return {
      entityType: "Document",
      entityId: ex.documentId,
      title: failed ? `Field extraction failed: ${ex.document.fileName}` : `Low-confidence extraction: ${ex.document.fileName} (${confidencePct}%)`,
      observation: failed
        ? `Extraction on "${ex.document.fileName}" failed. Reason: ${(ex.fields as any)?.error ?? "not a text-based document this v1 can read"}.`
        : `Extraction on "${ex.document.fileName}" completed with ${confidencePct}% confidence - below the 60% threshold this app treats as reliable enough to act on unreviewed.`,
      reasoning: failed
        ? "This build has no OCR engine for image-based/scanned documents - a failed extraction needs either a text-based re-upload or manual entry."
        : "Confidence below 60% means fewer than the expected fields (amount/date/invoice number/tax number) were found - the extracted values may be incomplete or wrong.",
      confidence: failed ? 100 : 100 - confidencePct,
      dataCompleteness: confidencePct,
      evidenceQuality: `DocumentExtraction record for ${ex.document.fileName}`,
      ruleCertainty: "Deterministic status/confidence threshold",
      risk: failed ? "MEDIUM" : "LOW",
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: failed ? "CLIENT_CLARIFICATION" : "ACCOUNTANT_REVIEW",
    };
  });
}

// --- Compliance Agent --------------------------------------------------
// Reuses ComplianceCalendarService's own bucketing (SRS 47) - just
// surfaces OVERDUE and DUE_TODAY deadlines into the same review queue
// every other agent's findings land in.
export async function scanCompliance({ compliance }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const { buckets } = await compliance.list(clientId);
  const findings: FindingInput[] = [];

  for (const d of buckets.OVERDUE) {
    findings.push({
      entityType: "ComplianceDeadline",
      entityId: d.id,
      title: `Overdue: ${d.title}`,
      observation: `Deadline "${d.title}" (${d.category}) was due ${d.dueDate.toISOString().slice(0, 10)} and is not marked complete.`,
      reasoning: "A statutory or internal deadline past its due date and still open needs immediate attention.",
      confidence: 100,
      dataCompleteness: 100,
      evidenceQuality: "Direct read of the ComplianceDeadline record",
      ruleCertainty: "Deterministic date comparison",
      risk: "HIGH",
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "CA_REVIEW",
    });
  }
  for (const d of buckets.DUE_TODAY) {
    findings.push({
      entityType: "ComplianceDeadline",
      entityId: d.id,
      title: `Due today: ${d.title}`,
      observation: `Deadline "${d.title}" (${d.category}) is due today.`,
      reasoning: "Flagging same-day deadlines so they don't slip to OVERDUE.",
      confidence: 100,
      dataCompleteness: 100,
      evidenceQuality: "Direct read of the ComplianceDeadline record",
      ruleCertainty: "Deterministic date comparison",
      risk: "MEDIUM",
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "ACCOUNTANT_REVIEW",
    });
  }
  return findings;
}

// --- Financial Analyst Agent ------------------------------------------------
// Compares revenue and expense totals between the two most recent
// accounting periods and flags a material period-over-period swing - a
// real computed anomaly signal, not a narrative "analysis" (no LLM is
// wired into this app process to write one honestly).
export async function scanFinancialAnalyst({ prisma }: AgentContext, clientId: string): Promise<FindingInput[]> {
  const periods = await prisma.accountingPeriod.findMany({
    where: { clientId },
    orderBy: { startDate: "desc" },
    take: 2,
  });
  if (periods.length < 2) return [];
  const [current, prior] = periods;

  async function netForType(periodId: string, type: "REVENUE" | "EXPENSE"): Promise<number> {
    const lines = await prisma.journalLine.findMany({
      where: { journal: { periodId, status: { in: [...ACTIVE_JOURNAL_STATUSES] } }, account: { type } },
      select: { debit: true, credit: true },
    });
    // REVENUE is credit-normal, EXPENSE is debit-normal - net each to a
    // positive "normal" figure so a period-over-period ratio is meaningful.
    const sum = lines.reduce((acc, l) => acc + (Number(l.debit) - Number(l.credit)), 0);
    return type === "REVENUE" ? -sum : sum;
  }

  const findings: FindingInput[] = [];
  for (const type of ["REVENUE", "EXPENSE"] as const) {
    const currentValue = await netForType(current.id, type);
    const priorValue = await netForType(prior.id, type);
    if (priorValue === 0) continue; // no meaningful baseline to compare against
    const changePct = ((currentValue - priorValue) / Math.abs(priorValue)) * 100;
    if (Math.abs(changePct) < 25) continue;

    findings.push({
      entityType: "AccountingPeriod",
      entityId: current.id,
      title: `${type === "REVENUE" ? "Revenue" : "Expenses"} changed ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% vs. prior period`,
      observation: `${type === "REVENUE" ? "Revenue" : "Expenses"} in ${current.name} totalled ${currentValue.toFixed(2)}, vs. ${priorValue.toFixed(2)} in ${prior.name} (computed from posted journal lines against ${type}-type accounts).`,
      reasoning: `A period-over-period swing of 25% or more in ${type.toLowerCase()} is large enough to warrant a look before it's reported - it may be a real business change, a misclassification, or a missed/duplicated entry.`,
      confidence: 100,
      dataCompleteness: 100,
      evidenceQuality: `Live sum of JournalLine rows for ${current.name} and ${prior.name}`,
      ruleCertainty: "Deterministic period-over-period computation",
      risk: Math.abs(changePct) >= 50 ? "HIGH" : "MEDIUM",
      materiality: Math.abs(currentValue - priorValue),
      recommendedAction: "ESCALATE_TO_REVIEW",
      reviewSeverity: "CA_REVIEW",
    });
  }
  return findings;
}

export const AGENT_SCANS: Record<string, (ctx: AgentContext, clientId: string) => Promise<FindingInput[]>> = {
  ACCOUNTING: scanAccounting,
  TAX: scanTax,
  AUDIT: scanAudit,
  RECONCILIATION: scanReconciliation,
  REPORTING: scanReporting,
  DOCUMENT: scanDocument,
  COMPLIANCE: scanCompliance,
  FINANCIAL_ANALYST: scanFinancialAnalyst,
};
