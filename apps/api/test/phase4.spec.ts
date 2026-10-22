import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "../src/audit/audit.service";
import { EngagementsService } from "../src/engagements/engagements.service";
import { IndependenceService } from "../src/independence/independence.service";
import { AuditWorkService } from "../src/audit-work/audit-work.service";
import { JudgmentService } from "../src/judgment/judgment.service";
import type { RequestUser } from "../src/common/types";

// Integration tests for Phase 4 (Professional CA): the identity-based
// segregation-of-duties invariant that runs through engagement conclusion,
// independence exception resolution, and judgment-case approval (SRS 55) -
// each rejects an actor who is the same user that did the prior step,
// independent of what permissions that actor holds - plus the workflow
// transitions that gate those actions (completion checklist, independence
// status computation).
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const engagements = new EngagementsService(prisma as any, audit);
const independence = new IndependenceService(prisma as any, audit);
const auditWork = new AuditWorkService(prisma as any, audit);
const judgment = new JudgmentService(prisma as any, audit);

let clientId: string;
let preparer: RequestUser;
let approver: RequestUser;

function toRequestUser(user: { id: string; firmId: string; email: string; firstName: string; lastName: string }): RequestUser {
  return {
    id: user.id,
    firmId: user.firmId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    firmWidePermissions: [],
    clientPermissions: {},
  };
}

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);
  const firm = await prisma.firm.create({ data: { name: `P4 Test Firm ${suffix}` } });
  const preparerUser = await prisma.user.create({
    data: { firmId: firm.id, email: `p4-preparer-${suffix}@example.test`, passwordHash: "x", firstName: "Prep", lastName: "Arer", status: "ACTIVE" },
  });
  const approverUser = await prisma.user.create({
    data: { firmId: firm.id, email: `p4-approver-${suffix}@example.test`, passwordHash: "x", firstName: "Appr", lastName: "Over", status: "ACTIVE" },
  });
  const client = await prisma.client.create({ data: { firmId: firm.id, legalName: `P4 Client ${suffix}`, jurisdiction: "SA-TEST" } });
  clientId = client.id;
  preparer = toRequestUser(preparerUser);
  approver = toRequestUser(approverUser);
}

async function makeAcceptedEngagement() {
  const created = await engagements.create(preparer, clientId, {
    serviceType: "AUDIT",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    materialityAmount: 50000,
    materialityBasis: "5% of net income",
  });
  await engagements.setAcceptance(preparer, clientId, created.id, true);
  return created.id;
}

async function completeChecklist(engagementId: string) {
  const items = await engagements.startCompletion(preparer, clientId, engagementId);
  for (const item of items) {
    await engagements.updateCompletionItem(preparer, clientId, engagementId, item.id, { status: "COMPLETE" });
  }
}

beforeEach(async () => {
  await makeFixture();
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("EngagementsService", () => {
  it("creates a PENDING/PLANNED engagement and accepting it moves it to ACCEPTED/IN_PROGRESS", async () => {
    const created = await engagements.create(preparer, clientId, {
      serviceType: "REVIEW",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
    });
    expect(created.acceptanceStatus).toBe("PENDING");
    expect(created.status).toBe("PLANNED");

    const accepted = await engagements.setAcceptance(preparer, clientId, created.id, true);
    expect(accepted.acceptanceStatus).toBe("ACCEPTED");
    expect(accepted.status).toBe("IN_PROGRESS");
  });

  it("declining an engagement cancels it", async () => {
    const created = await engagements.create(preparer, clientId, {
      serviceType: "REVIEW",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
    });
    const declined = await engagements.setAcceptance(preparer, clientId, created.id, false);
    expect(declined.acceptanceStatus).toBe("DECLINED");
    expect(declined.status).toBe("CANCELLED");
  });

  it("blocks conclude() while any completion checklist item is still PENDING", async () => {
    const engagementId = await makeAcceptedEngagement();
    await engagements.startCompletion(preparer, clientId, engagementId);

    await expect(
      engagements.conclude(preparer, clientId, engagementId, { conclusionText: "Draft conclusion" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows conclude() once every checklist item is COMPLETE or NOT_APPLICABLE", async () => {
    const engagementId = await makeAcceptedEngagement();
    const items = await engagements.startCompletion(preparer, clientId, engagementId);
    // Exercise both terminal statuses, not just COMPLETE.
    await engagements.updateCompletionItem(preparer, clientId, engagementId, items[0].id, { status: "NOT_APPLICABLE" });
    for (const item of items.slice(1)) {
      await engagements.updateCompletionItem(preparer, clientId, engagementId, item.id, { status: "COMPLETE" });
    }

    const concluded = await engagements.conclude(preparer, clientId, engagementId, { conclusionText: "All clear." });
    expect(concluded.concludedById).toBe(preparer.id);
    expect(concluded.conclusionText).toBe("All clear.");
  });

  it("rejects approve() by the same user who concluded the engagement (SRS 55)", async () => {
    const engagementId = await makeAcceptedEngagement();
    await completeChecklist(engagementId);
    await engagements.conclude(preparer, clientId, engagementId, { conclusionText: "Done." });

    await expect(engagements.approve(preparer, clientId, engagementId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows approve() by a different user and marks the engagement COMPLETED", async () => {
    const engagementId = await makeAcceptedEngagement();
    await completeChecklist(engagementId);
    await engagements.conclude(preparer, clientId, engagementId, { conclusionText: "Done." });

    const approved = await engagements.approve(approver, clientId, engagementId);
    expect(approved.approvedById).toBe(approver.id);
    expect(approved.status).toBe("COMPLETED");
  });

  it("rejects approve() before the engagement has been concluded", async () => {
    const engagementId = await makeAcceptedEngagement();
    await expect(engagements.approve(approver, clientId, engagementId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("adds a team member scoped to the engagement", async () => {
    const engagementId = await makeAcceptedEngagement();
    const member = await engagements.addTeamMember(preparer, clientId, engagementId, { userId: approver.id, role: "STAFF" });
    expect(member.userId).toBe(approver.id);
    expect(member.role).toBe("STAFF");
  });
});

describe("IndependenceService", () => {
  it("computes CLEARED when no threat flags are set", async () => {
    const engagementId = await makeAcceptedEngagement();
    const check = await independence.create(preparer, clientId, engagementId, {});
    expect(check.status).toBe("CLEARED");
    expect(check.resolution).toBe("PENDING");
  });

  it("computes EXCEPTION when any threat flag is set, and reflects it on the engagement", async () => {
    const engagementId = await makeAcceptedEngagement();
    const check = await independence.create(preparer, clientId, engagementId, { selfReviewThreat: true, notes: "Prior bookkeeping." });
    expect(check.status).toBe("EXCEPTION");

    const engagement = await engagements.get(clientId, engagementId);
    expect(engagement.independenceStatus).toBe("EXCEPTION");
  });

  it("rejects resolve() by the same user who logged the exception (SRS 55)", async () => {
    const engagementId = await makeAcceptedEngagement();
    const check = await independence.create(preparer, clientId, engagementId, { selfReviewThreat: true });

    await expect(
      independence.resolve(preparer, clientId, engagementId, check.id, { resolution: "SAFEGUARDED", resolutionNotes: "Different reviewer assigned." }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows resolve() by a different user", async () => {
    const engagementId = await makeAcceptedEngagement();
    const check = await independence.create(preparer, clientId, engagementId, { selfReviewThreat: true });

    const resolved = await independence.resolve(approver, clientId, engagementId, check.id, {
      resolution: "SAFEGUARDED",
      resolutionNotes: "Different reviewer assigned.",
    });
    expect(resolved.resolvedById).toBe(approver.id);
    expect(resolved.resolution).toBe("SAFEGUARDED");
  });

  it("rejects resolving a check that isn't an unresolved EXCEPTION", async () => {
    const engagementId = await makeAcceptedEngagement();
    const cleared = await independence.create(preparer, clientId, engagementId, {});
    await expect(
      independence.resolve(approver, clientId, engagementId, cleared.id, { resolution: "SAFEGUARDED", resolutionNotes: "n/a" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("AuditWorkService", () => {
  it("supports the risk -> procedure -> evidence -> finding chain, scoped to one engagement", async () => {
    const engagementId = await makeAcceptedEngagement();

    const risk = await auditWork.createRisk(preparer, clientId, engagementId, {
      description: "Revenue cutoff risk",
      category: "INHERENT",
      assertion: "CUTOFF",
      likelihood: "HIGH",
      impact: "HIGH",
    });
    expect(risk.engagementId).toBe(engagementId);

    const procedure = await auditWork.createProcedure(preparer, clientId, engagementId, {
      riskId: risk.id,
      assertion: "CUTOFF",
      procedureType: "SUBSTANTIVE_TEST",
      description: "Test cutoff sample",
      sampleSize: 25,
    });
    expect(procedure.status).toBe("NOT_STARTED");
    expect(procedure.performedById).toBeNull();

    const updated = await auditWork.updateProcedure(preparer, clientId, engagementId, procedure.id, {
      status: "COMPLETED",
      conclusion: "No exceptions noted.",
    });
    expect(updated.performedById).toBe(preparer.id);
    expect(updated.performedAt).not.toBeNull();

    const evidence = await auditWork.createEvidence(preparer, clientId, engagementId, {
      procedureId: procedure.id,
      description: "Sample invoices",
      evidenceType: "DOCUMENT",
    });
    expect(evidence.obtainedById).toBe(preparer.id);

    const finding = await auditWork.createFinding(preparer, clientId, engagementId, {
      procedureId: procedure.id,
      riskId: risk.id,
      type: "EXCEPTION",
      description: "One invoice recorded a day late",
      severity: "LOW",
    });
    expect(finding.status).toBe("OPEN");
    expect(finding.resolvedAt).toBeNull();

    const resolvedFinding = await auditWork.updateFinding(preparer, clientId, engagementId, finding.id, {
      status: "RESOLVED",
      managementResponse: "Immaterial; no adjustment.",
    });
    expect(resolvedFinding.status).toBe("RESOLVED");
    expect(resolvedFinding.resolvedAt).not.toBeNull();

    const risks = await auditWork.listRisks(clientId, engagementId);
    const procedures = await auditWork.listProcedures(clientId, engagementId);
    const evidenceList = await auditWork.listEvidence(clientId, engagementId);
    const findings = await auditWork.listFindings(clientId, engagementId);
    expect(risks).toHaveLength(1);
    expect(procedures).toHaveLength(1);
    expect(evidenceList).toHaveLength(1);
    expect(findings).toHaveLength(1);
  });
});

describe("JudgmentService", () => {
  it("moves a case through OPEN -> DECIDED -> APPROVED", async () => {
    const engagementId = await makeAcceptedEngagement();
    const created = await judgment.create(preparer, clientId, {
      engagementId,
      question: "Capitalize or expense the ERP license?",
      facts: "3-year license, SAR 300,000.",
      applicableStandards: "IAS 38",
      possibleTreatments: JSON.stringify([{ treatment: "Capitalize" }, { treatment: "Expense" }]),
      risk: "MEDIUM",
    });
    expect(created.status).toBe("OPEN");

    const decided = await judgment.decide(preparer, clientId, created.id, {
      decision: "Capitalize and amortize over the license term.",
      recommendation: "Recognize as an intangible asset.",
    });
    expect(decided.status).toBe("DECIDED");
    expect(decided.decidedById).toBe(preparer.id);

    const approved = await judgment.approve(approver, clientId, created.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe(approver.id);
  });

  it("rejects approve() by the same user who made the decision (SRS 55)", async () => {
    const created = await judgment.create(preparer, clientId, {
      question: "Revenue recognition timing",
      facts: "Multi-year service contract.",
    });
    await judgment.decide(preparer, clientId, created.id, { decision: "Recognize over the contract term." });

    await expect(judgment.approve(preparer, clientId, created.id)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects deciding a case that isn't OPEN", async () => {
    const created = await judgment.create(preparer, clientId, { question: "Q", facts: "F" });
    await judgment.decide(preparer, clientId, created.id, { decision: "D1" });

    await expect(judgment.decide(approver, clientId, created.id, { decision: "D2" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects approving a case that hasn't been decided yet", async () => {
    const created = await judgment.create(preparer, clientId, { question: "Q", facts: "F" });
    await expect(judgment.approve(approver, clientId, created.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
