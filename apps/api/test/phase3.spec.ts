import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { JournalsService } from "../src/accounting/journals/journals.service";
import { AuditService } from "../src/audit/audit.service";
import { ReportsService } from "../src/reports/reports.service";
import { RegulatoryRulesService } from "../src/regulatory-rules/regulatory-rules.service";
import { ComplianceCalendarService } from "../src/compliance/compliance-calendar.service";
import { TaxPeriodsService } from "../src/tax-periods/tax-periods.service";
import { VatReturnsService } from "../src/vat/vat-returns.service";
import { WhtService } from "../src/wht/wht.service";
import { ZakatService } from "../src/zakat/zakat.service";
import { PaymentsService } from "../src/payments/payments.service";
import { buildZatcaQrPayloadBase64 } from "../src/einvoice/zatca-qr";
import type { RequestUser } from "../src/common/types";

// Integration tests for Phase 3 (Saudi compliance): the regulatory rules
// engine's effective-date resolution, VAT/WHT/Zakat posting invariants
// (every filed return that touches the ledger must stay balanced - SRS 11,
// 65), and the compliance calendar's bucketing.
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const journals = new JournalsService(prisma as any, audit);
const reports = new ReportsService(prisma as any);
const rules = new RegulatoryRulesService(prisma as any, audit);
const compliance = new ComplianceCalendarService(prisma as any, audit);
const taxPeriods = new TaxPeriodsService(prisma as any, audit, compliance);
const vatReturns = new VatReturnsService(prisma as any, journals, audit);
const wht = new WhtService(prisma as any, audit, rules);
const zakat = new ZakatService(prisma as any, journals, audit, rules);
const payments = new PaymentsService(prisma as any, journals, audit);

let clientId: string;
let actor: RequestUser;
let accounts: Record<string, string>;

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);
  const firm = await prisma.firm.create({ data: { name: `P3 Test Firm ${suffix}` } });
  const user = await prisma.user.create({
    data: { firmId: firm.id, email: `p3-${suffix}@example.test`, passwordHash: "x", firstName: "T", lastName: "U", status: "ACTIVE" },
  });
  const client = await prisma.client.create({ data: { firmId: firm.id, legalName: `P3 Client ${suffix}`, jurisdiction: "SA" } });
  clientId = client.id;

  const specs: Array<[string, string, string, string, boolean, string?]> = [
    ["bank", "1100", "ASSET", "DEBIT", true, "BANK"],
    ["ap", "2100", "LIABILITY", "CREDIT", true, "ACCOUNTS_PAYABLE"],
    ["vatOutput", "2200", "LIABILITY", "CREDIT", true, "VAT_OUTPUT"],
    ["vatInput", "1300", "ASSET", "DEBIT", true, "VAT_INPUT"],
    ["whtPayable", "2500", "LIABILITY", "CREDIT", false],
    ["equity", "3000", "EQUITY", "CREDIT", false],
    ["expense", "5900", "EXPENSE", "DEBIT", false],
    ["zakatPayable", "2600", "LIABILITY", "CREDIT", false],
  ];
  accounts = {};
  for (const [key, code, type, normalBalance, isControl, controlType] of specs) {
    const account = await prisma.chartOfAccount.create({
      data: { clientId, code, name: key, type: type as any, normalBalance: normalBalance as any, isControlAccount: isControl, controlAccountType: (controlType as any) ?? null },
    });
    accounts[key] = account.id;
  }

  const fiscalYear = await prisma.fiscalYear.create({
    data: { clientId, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
  });
  await prisma.accountingPeriod.create({
    data: { clientId, fiscalYearId: fiscalYear.id, name: "2026-01", startDate: new Date("2026-01-01"), endDate: new Date("2026-01-31") },
  });
  // Zakat returns post on the tax period's end date, which for an annual
  // Zakat period lands in December - covered separately so it doesn't
  // overlap the January accounting period above.
  await prisma.accountingPeriod.create({
    data: { clientId, fiscalYearId: fiscalYear.id, name: "2026-12", startDate: new Date("2026-12-01"), endDate: new Date("2026-12-31") },
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

async function expectBalanced() {
  const tb = await reports.trialBalance(clientId, "2026-12-31");
  expect(tb.balanced).toBe(true);
  return tb;
}

beforeAll(async () => {
  await prisma.$connect();
  // Seed a minimal, isolated set of regulatory rules for these tests so
  // they don't depend on (or collide with) whatever the dev seed script
  // has inserted for "SA".
  const jurisdiction = "SA-TEST";
  await prisma.regulatoryRule.createMany({
    data: [
      { jurisdiction, authority: "TEST", ruleType: "VAT_RATE", code: "STANDARD", name: "Standard", rate: 5, effectiveFrom: new Date("2018-01-01"), effectiveTo: new Date("2020-06-30") },
      { jurisdiction, authority: "TEST", ruleType: "VAT_RATE", code: "STANDARD", name: "Standard", rate: 15, effectiveFrom: new Date("2020-07-01") },
      { jurisdiction, authority: "TEST", ruleType: "WHT_RATE", code: "SERVICES", name: "Services", rate: 5, effectiveFrom: new Date("2018-01-01") },
      { jurisdiction, authority: "TEST", ruleType: "ZAKAT_RATE", code: "STANDARD", name: "Standard", rate: 2.5, effectiveFrom: new Date("2018-01-01") },
    ],
  });
});

beforeEach(async () => {
  await makeFixture();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RegulatoryRulesService", () => {
  it("resolves the rate in effect on a given date, not just the latest one", async () => {
    const before = await rules.resolve("SA-TEST", "VAT_RATE", "STANDARD", new Date("2019-01-01"));
    expect(Number(before.rate)).toBe(5);

    const after = await rules.resolve("SA-TEST", "VAT_RATE", "STANDARD", new Date("2021-01-01"));
    expect(Number(after.rate)).toBe(15);
  });

  it("throws when no rule covers the requested date", async () => {
    await expect(rules.resolve("SA-TEST", "VAT_RATE", "STANDARD", new Date("2010-01-01"))).rejects.toBeInstanceOf(NotFoundException);
  });

  it("auto-closes an existing open-ended rule when a new version supersedes it", async () => {
    const created = await rules.create(actor, {
      jurisdiction: "SA-TEST2",
      authority: "TEST",
      ruleType: "VAT_RATE",
      code: "STANDARD",
      name: "Standard",
      rate: 5,
      effectiveFrom: "2018-01-01",
    });
    expect(created.effectiveTo).toBeNull();

    await rules.create(actor, {
      jurisdiction: "SA-TEST2",
      authority: "TEST",
      ruleType: "VAT_RATE",
      code: "STANDARD",
      name: "Standard",
      rate: 15,
      effectiveFrom: "2020-07-01",
    });

    const original = await prisma.regulatoryRule.findUniqueOrThrow({ where: { id: created.id } });
    expect(original.effectiveTo?.toISOString().slice(0, 10)).toBe("2020-06-30");

    const resolved = await rules.resolve("SA-TEST2", "VAT_RATE", "STANDARD", new Date("2026-01-01"));
    expect(Number(resolved.rate)).toBe(15);
  });
});

describe("VatReturnsService", () => {
  it("computes output/input VAT from posted journal activity and files a balanced settlement", async () => {
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-10",
      description: "Sale with VAT",
      lines: [
        { accountId: accounts.bank, debit: 1150, credit: 0 },
        { accountId: accounts.equity, debit: 0, credit: 1000 },
        { accountId: accounts.vatOutput, debit: 0, credit: 150 },
      ],
    });
    await journals.post(actor, clientId, draft.id);

    const period = await taxPeriods.create(actor, clientId, { periodType: "VAT", name: "2026-01", startDate: "2026-01-01", endDate: "2026-01-31" });
    const vatReturn = await vatReturns.generate(actor, clientId, { taxPeriodId: period.id });
    expect(Number(vatReturn.outputVat)).toBe(150);
    expect(Number(vatReturn.inputVat)).toBe(0);
    expect(Number(vatReturn.netVatDue)).toBe(150);

    const filed = await vatReturns.file(actor, clientId, vatReturn.id, { payableAccountId: accounts.bank });
    expect(filed.status).toBe("FILED");
    await expectBalanced();
  });

  it("rejects filing a period with no VAT activity", async () => {
    const period = await taxPeriods.create(actor, clientId, { periodType: "VAT", name: "2026-02", startDate: "2026-02-01", endDate: "2026-02-28" });
    const vatReturn = await vatReturns.generate(actor, clientId, { taxPeriodId: period.id });
    await expect(vatReturns.file(actor, clientId, vatReturn.id, { payableAccountId: accounts.bank })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("Withholding tax", () => {
  it("calculates WHT from the supplier's category via the rules engine", async () => {
    const supplier = await prisma.supplier.create({
      data: { clientId, code: "S1", name: "Test Supplier", apAccountId: accounts.ap, whtCategoryCode: "SERVICES" },
    });
    // Client fixture uses jurisdiction "SA" by default from makeFixture (no override) - reset to SA-TEST for this test.
    await prisma.client.update({ where: { id: clientId }, data: { jurisdiction: "SA-TEST" } });

    const result = await wht.calculate(clientId, { supplierId: supplier.id, amount: 1000, date: "2026-01-10" });
    expect(result.applicable).toBe(true);
    expect(result.whtAmount).toBe(50);
    expect(result.netAmount).toBe(950);
  });

  it("returns not-applicable when the supplier has no WHT category", async () => {
    const supplier = await prisma.supplier.create({ data: { clientId, code: "S2", name: "No WHT Supplier", apAccountId: accounts.ap } });
    const result = await wht.calculate(clientId, { supplierId: supplier.id, amount: 1000, date: "2026-01-10" });
    expect(result.applicable).toBe(false);
    expect(result.whtAmount).toBe(0);
  });

  it("a payment with WHT posts a balanced journal that nets bank + WHT payable to the AP amount", async () => {
    const supplier = await prisma.supplier.create({ data: { clientId, code: "S3", name: "WHT Supplier", apAccountId: accounts.ap } });
    const bill = await prisma.bill.create({
      data: {
        clientId,
        supplierId: supplier.id,
        billNumber: "B1",
        date: new Date("2026-01-10"),
        dueDate: new Date("2026-01-20"),
        subtotal: 1000,
        taxTotal: 0,
        total: 1000,
        status: "POSTED",
      },
    });

    const payment = await payments.create(actor, clientId, {
      type: "PAYMENT",
      supplierId: supplier.id,
      date: "2026-01-15",
      amount: 1000,
      bankAccountId: accounts.bank,
      whtAmount: 50,
      whtPayableAccountId: accounts.whtPayable,
      allocations: [{ billId: bill.id, amount: 1000 }],
    });
    expect(Number(payment.whtAmount)).toBe(50);
    await expectBalanced();

    const bankLine = await prisma.journalLine.findFirstOrThrow({ where: { journalId: payment.journalId!, accountId: accounts.bank } });
    expect(Number(bankLine.credit)).toBe(950);
    const whtLine = await prisma.journalLine.findFirstOrThrow({ where: { journalId: payment.journalId!, accountId: accounts.whtPayable } });
    expect(Number(whtLine.credit)).toBe(50);
  });
});

describe("ZakatService", () => {
  it("computes zakatBase from equity and net fixed assets, and adjustments change it correctly", async () => {
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-05",
      description: "Capital contribution",
      lines: [
        { accountId: accounts.bank, debit: 100000, credit: 0 },
        { accountId: accounts.equity, debit: 0, credit: 100000 },
      ],
    });
    await journals.post(actor, clientId, draft.id);
    await prisma.client.update({ where: { id: clientId }, data: { jurisdiction: "SA-TEST" } });

    const period = await taxPeriods.create(actor, clientId, { periodType: "ZAKAT", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31" });
    const zakatReturn = await zakat.create(actor, clientId, { taxPeriodId: period.id });
    expect(Number(zakatReturn.equityAmount)).toBe(100000);
    expect(Number(zakatReturn.zakatBase)).toBe(100000);
    expect(Number(zakatReturn.zakatDue)).toBe(2500); // 2.5% of 100,000

    const withAddition = await zakat.addAdjustment(actor, clientId, zakatReturn.id, {
      description: "Add-back",
      type: "ADDITION",
      amount: 20000,
    });
    expect(Number(withAddition.zakatBase)).toBe(120000);
    expect(Number(withAddition.zakatDue)).toBe(3000);

    const filed = await zakat.file(actor, clientId, zakatReturn.id, { expenseAccountId: accounts.expense, payableAccountId: accounts.zakatPayable });
    expect(filed.status).toBe("FILED");
    expect(Number(filed.zakatDue)).toBe(3000);
    await expectBalanced();
  });

  it("files without posting a journal when zakatDue is zero", async () => {
    await prisma.client.update({ where: { id: clientId }, data: { jurisdiction: "SA-TEST" } });
    const period = await taxPeriods.create(actor, clientId, { periodType: "ZAKAT", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31" });
    const zakatReturn = await zakat.create(actor, clientId, { taxPeriodId: period.id });
    expect(Number(zakatReturn.zakatDue)).toBe(0);

    const filed = await zakat.file(actor, clientId, zakatReturn.id, { expenseAccountId: accounts.expense, payableAccountId: accounts.zakatPayable });
    expect(filed.status).toBe("FILED");
    expect(filed.journalId).toBeNull();
  });
});

describe("ComplianceCalendarService bucketing", () => {
  it("buckets deadlines correctly relative to now", async () => {
    const now = new Date();
    const inTwoDays = new Date(now);
    inTwoDays.setUTCDate(inTwoDays.getUTCDate() + 2);
    const nextMonth = new Date(now);
    nextMonth.setUTCDate(nextMonth.getUTCDate() + 45);
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await compliance.createDeadline(actor, clientId, { category: "CUSTOM", title: "Overdue thing", dueDate: yesterday });
    await compliance.createDeadline(actor, clientId, { category: "CUSTOM", title: "This week", dueDate: inTwoDays });
    await compliance.createDeadline(actor, clientId, { category: "CUSTOM", title: "Far future", dueDate: nextMonth });

    const { buckets } = await compliance.list(clientId);
    expect(buckets.OVERDUE.map((d) => d.title)).toContain("Overdue thing");
    expect(buckets.DUE_THIS_WEEK.map((d) => d.title)).toContain("This week");
    expect(buckets.UPCOMING.map((d) => d.title)).toContain("Far future");
  });
});

describe("ZATCA QR TLV payload", () => {
  it("round-trips through TLV decoding", () => {
    const base64 = buildZatcaQrPayloadBase64({
      sellerName: "Test Seller",
      vatRegistrationNumber: "300000000000003",
      timestamp: new Date("2026-01-15T10:00:00.000Z"),
      invoiceTotal: 1150,
      vatTotal: 150,
    });

    const buf = Buffer.from(base64, "base64");
    const fields: Record<number, string> = {};
    let i = 0;
    while (i < buf.length) {
      const tag = buf[i];
      const len = buf[i + 1];
      fields[tag] = buf.subarray(i + 2, i + 2 + len).toString("utf-8");
      i += 2 + len;
    }
    expect(fields[1]).toBe("Test Seller");
    expect(fields[2]).toBe("300000000000003");
    expect(fields[4]).toBe("1150.00");
    expect(fields[5]).toBe("150.00");
  });
});
