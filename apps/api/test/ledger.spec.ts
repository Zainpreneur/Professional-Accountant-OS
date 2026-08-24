import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException } from "@nestjs/common";
import { JournalsService } from "../src/accounting/journals/journals.service";
import { AuditService } from "../src/audit/audit.service";
import { ReportsService } from "../src/reports/reports.service";
import type { RequestUser } from "../src/common/types";

// Integration tests against a real Postgres database (apps/api/.env.test)
// proving the accounting core's central invariant (SRS 11, 65): a journal
// can never be posted unless total debit === total credit, postings are
// rejected once a period is locked, and a reversal exactly offsets the
// original entry rather than mutating it. These exercise JournalsService
// directly (the only code path allowed to write JournalLine rows) rather
// than going through HTTP, so failures point straight at the ledger logic.
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const journals = new JournalsService(prisma as any, audit);
const reports = new ReportsService(prisma as any);

let firmId: string;
let clientId: string;
let userId: string;
let cashAccountId: string;
let revenueAccountId: string;
let periodId: string;
let actor: RequestUser;

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);

  const firm = await prisma.firm.create({ data: { name: `Test Firm ${suffix}` } });
  firmId = firm.id;

  const user = await prisma.user.create({
    data: {
      firmId,
      email: `tester-${suffix}@example.test`,
      passwordHash: "not-used-in-tests",
      firstName: "Test",
      lastName: "User",
      status: "ACTIVE",
    },
  });
  userId = user.id;

  const client = await prisma.client.create({ data: { firmId, legalName: `Test Client ${suffix}` } });
  clientId = client.id;

  const cash = await prisma.chartOfAccount.create({
    data: { clientId, code: "1000", name: "Cash", type: "ASSET", normalBalance: "DEBIT" },
  });
  cashAccountId = cash.id;

  const revenue = await prisma.chartOfAccount.create({
    data: { clientId, code: "4000", name: "Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  });
  revenueAccountId = revenue.id;

  const fiscalYear = await prisma.fiscalYear.create({
    data: { clientId, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
  });

  const period = await prisma.accountingPeriod.create({
    data: {
      clientId,
      fiscalYearId: fiscalYear.id,
      name: "2026-01",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    },
  });
  periodId = period.id;

  actor = {
    id: userId,
    firmId,
    email: user.email,
    firstName: "Test",
    lastName: "User",
    firmWidePermissions: [],
    clientPermissions: {},
  };
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

describe("JournalsService - ledger integrity", () => {
  it("rejects a journal where total debit does not equal total credit", async () => {
    await expect(
      journals.createDraft(actor, clientId, {
        date: "2026-01-15",
        description: "Unbalanced entry",
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 90 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a line that carries both a debit and a credit", async () => {
    await expect(
      journals.createDraft(actor, clientId, {
        date: "2026-01-15",
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 100 },
          { accountId: revenueAccountId, debit: 0, credit: 100 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("posts a balanced journal and the trial balance nets to zero", async () => {
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-15",
      description: "Cash sale",
      lines: [
        { accountId: cashAccountId, debit: 500, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 500 },
      ],
    });
    expect(draft.status).toBe("DRAFT");

    const posted = await journals.post(actor, clientId, draft.id);
    expect(posted.status).toBe("POSTED");

    const tb = await reports.trialBalance(clientId, "2026-01-31");
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebit).toBe(500);
    expect(tb.totalCredit).toBe(500);
  });

  it("refuses to post into a locked period", async () => {
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-15",
      lines: [
        { accountId: cashAccountId, debit: 200, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 200 },
      ],
    });

    await prisma.accountingPeriod.update({ where: { id: periodId }, data: { status: "LOCKED" } });

    await expect(journals.post(actor, clientId, draft.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reversing a posted journal exactly offsets it, leaving zero net ledger impact", async () => {
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-10",
      lines: [
        { accountId: cashAccountId, debit: 300, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 300 },
      ],
    });
    const posted = await journals.post(actor, clientId, draft.id);

    const reversal = await journals.reverse(actor, clientId, posted.id, "test reversal", new Date("2026-01-20"));
    expect(reversal.status).toBe("POSTED");

    const original = await prisma.journal.findUniqueOrThrow({ where: { id: posted.id } });
    expect(original.status).toBe("REVERSED");

    const tb = await reports.trialBalance(clientId);
    expect(tb.totalDebit).toBe(0);
    expect(tb.totalCredit).toBe(0);
    expect(tb.balanced).toBe(true);
  });

  it("rejects posting a journal against an account from a different client", async () => {
    const otherClient = await prisma.client.create({ data: { firmId, legalName: `Other Client ${randomUUID()}` } });
    const foreignAccount = await prisma.chartOfAccount.create({
      data: { clientId: otherClient.id, code: "9999", name: "Foreign", type: "ASSET", normalBalance: "DEBIT" },
    });

    await expect(
      journals.createDraft(actor, clientId, {
        date: "2026-01-15",
        lines: [
          { accountId: foreignAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 100 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
