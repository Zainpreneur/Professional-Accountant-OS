import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException } from "@nestjs/common";
import { JournalsService } from "../src/accounting/journals/journals.service";
import { AuditService } from "../src/audit/audit.service";
import { ReportsService } from "../src/reports/reports.service";
import { FixedAssetsService } from "../src/fixed-assets/fixed-assets.service";
import { StockMovementsService } from "../src/inventory/stock-movements.service";
import { ExpenseClaimsService } from "../src/expenses/expense-claims.service";
import { PayrollService } from "../src/payroll/payroll.service";
import { BankingService } from "../src/banking/banking.service";
import type { RequestUser } from "../src/common/types";

// Integration tests for the Phase 2 modules' GL-posting invariants: every
// service under test must leave the ledger balanced (SRS 11, 65) after
// every operation, whatever else it does internally.
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const journals = new JournalsService(prisma as any, audit);
const reports = new ReportsService(prisma as any);
const fixedAssets = new FixedAssetsService(prisma as any, journals, audit);
const stockMovements = new StockMovementsService(prisma as any, journals, audit);
const expenseClaims = new ExpenseClaimsService(prisma as any, journals, audit);
const payroll = new PayrollService(prisma as any, journals, audit);
const banking = new BankingService(prisma as any, journals, audit);

let clientId: string;
let actor: RequestUser;
let accounts: Record<string, string>;

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);
  const firm = await prisma.firm.create({ data: { name: `P2 Test Firm ${suffix}` } });
  const user = await prisma.user.create({
    data: { firmId: firm.id, email: `p2-${suffix}@example.test`, passwordHash: "x", firstName: "T", lastName: "U", status: "ACTIVE" },
  });
  const client = await prisma.client.create({ data: { firmId: firm.id, legalName: `P2 Client ${suffix}` } });
  clientId = client.id;

  const specs: Array<[string, string, string, string, boolean, string?]> = [
    ["bank", "1100", "ASSET", "DEBIT", true, "BANK"],
    ["cash", "1000", "ASSET", "DEBIT", true, "CASH"],
    ["fixedAsset", "1600", "ASSET", "DEBIT", false],
    ["accumDep", "1650", "ASSET", "CREDIT", false],
    ["depExpense", "5600", "EXPENSE", "DEBIT", false],
    ["gain", "4900", "REVENUE", "CREDIT", false],
    ["inventory", "1400", "ASSET", "DEBIT", false],
    ["cogs", "5000", "EXPENSE", "DEBIT", false],
    ["officeExpense", "5400", "EXPENSE", "DEBIT", false],
    ["salariesExpense", "5100", "EXPENSE", "DEBIT", false],
    ["salariesPayable", "2400", "LIABILITY", "CREDIT", false],
  ];
  accounts = {};
  for (const [key, code, type, normalBalance, isControl, controlType] of specs) {
    const account = await prisma.chartOfAccount.create({
      data: {
        clientId,
        code,
        name: key,
        type: type as any,
        normalBalance: normalBalance as any,
        isControlAccount: isControl,
        controlAccountType: (controlType as any) ?? null,
      },
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

async function expectBalanced() {
  const tb = await reports.trialBalance(clientId, "2026-12-31");
  expect(tb.balanced).toBe(true);
  return tb;
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

describe("FixedAssetsService", () => {
  it("acquisition and depreciation stay balanced, and depreciation never exceeds depreciable base", async () => {
    const asset = await fixedAssets.create(actor, clientId, {
      assetCode: "FA-1",
      name: "Laptop",
      acquisitionDate: "2026-01-01",
      acquisitionCost: 1200,
      salvageValue: 0,
      usefulLifeMonths: 12,
      assetAccountId: accounts.fixedAsset,
      depreciationExpenseAccountId: accounts.depExpense,
      accumulatedDepreciationAccountId: accounts.accumDep,
      fundingAccountId: accounts.bank,
    });
    await expectBalanced();

    const run1 = await fixedAssets.runDepreciation(actor, clientId, { periodLabel: "2026-01", runDate: "2026-01-31" });
    expect(Number(run1.totalAmount)).toBe(100); // 1200 / 12
    await expectBalanced();

    // Running the same period twice must be rejected (unique constraint).
    await expect(fixedAssets.runDepreciation(actor, clientId, { periodLabel: "2026-01", runDate: "2026-01-31" })).rejects.toThrow();

    const run2 = await fixedAssets.runDepreciation(actor, clientId, { periodLabel: "2026-02", runDate: "2026-02-28" });
    expect(Number(run2.totalAmount)).toBe(100);
    await expectBalanced();

    const reloaded = await fixedAssets.get(clientId, asset.id);
    expect(Number(reloaded.accumulatedDepreciation)).toBe(200);
  });

  it("disposal posts a balanced gain entry when proceeds exceed net book value", async () => {
    const asset = await fixedAssets.create(actor, clientId, {
      assetCode: "FA-2",
      name: "Equipment",
      acquisitionDate: "2026-01-01",
      acquisitionCost: 1000,
      salvageValue: 0,
      usefulLifeMonths: 10,
      assetAccountId: accounts.fixedAsset,
      depreciationExpenseAccountId: accounts.depExpense,
      accumulatedDepreciationAccountId: accounts.accumDep,
      fundingAccountId: accounts.bank,
    });
    await fixedAssets.runDepreciation(actor, clientId, { periodLabel: "2026-01", runDate: "2026-01-31" }); // accumDep = 100, NBV = 900

    const disposed = await fixedAssets.dispose(actor, clientId, asset.id, {
      disposalDate: "2026-02-01",
      disposalProceeds: 950, // gain of 50
      cashAccountId: accounts.bank,
      gainLossAccountId: accounts.gain,
    });
    expect(disposed.status).toBe("DISPOSED");
    await expectBalanced();
  });
});

describe("StockMovementsService", () => {
  async function makeProductAndWarehouse() {
    const product = await prisma.product.create({
      data: { clientId, sku: "SKU-T", name: "Test SKU", inventoryAccountId: accounts.inventory, cogsAccountId: accounts.cogs },
    });
    const warehouse = await prisma.warehouse.create({ data: { clientId, code: "WH-T", name: "Test Warehouse" } });
    return { product, warehouse };
  }

  it("weighted-average cost updates correctly across multiple receipts", async () => {
    const { product, warehouse } = await makeProductAndWarehouse();

    await stockMovements.receipt(actor, clientId, {
      productId: product.id,
      warehouseId: warehouse.id,
      date: "2026-01-01",
      quantity: 10,
      unitCost: 10,
      fundingAccountId: accounts.bank,
    });
    await stockMovements.receipt(actor, clientId, {
      productId: product.id,
      warehouseId: warehouse.id,
      date: "2026-01-02",
      quantity: 10,
      unitCost: 20,
      fundingAccountId: accounts.bank,
    });
    // (10*10 + 10*20) / 20 = 15
    const stock = await prisma.productStock.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    });
    expect(Number(stock.averageCost)).toBe(15);
    await expectBalanced();

    const issue = await stockMovements.issue(actor, clientId, {
      productId: product.id,
      warehouseId: warehouse.id,
      date: "2026-01-03",
      quantity: 5,
    });
    expect(Number(issue.unitCost)).toBe(15);
    expect(Number(issue.totalCost)).toBe(75);
    await expectBalanced();
  });

  it("refuses to issue more stock than is on hand", async () => {
    const { product, warehouse } = await makeProductAndWarehouse();
    await stockMovements.receipt(actor, clientId, {
      productId: product.id,
      warehouseId: warehouse.id,
      date: "2026-01-01",
      quantity: 5,
      unitCost: 10,
      fundingAccountId: accounts.bank,
    });

    await expect(
      stockMovements.issue(actor, clientId, { productId: product.id, warehouseId: warehouse.id, date: "2026-01-02", quantity: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ExpenseClaimsService", () => {
  it("posts a balanced journal reimbursing every line's category account", async () => {
    const employee = await prisma.employee.create({
      data: { clientId, employeeCode: "E1", firstName: "A", lastName: "B", hireDate: new Date("2025-01-01"), baseSalary: 5000 },
    });
    const claim = await expenseClaims.create(actor, clientId, {
      employeeId: employee.id,
      claimNumber: "EXP-T1",
      date: "2026-01-10",
      lines: [{ description: "Taxi", date: "2026-01-09", amount: 40, categoryAccountId: accounts.officeExpense }],
    });
    await expenseClaims.submit(actor, clientId, claim.id);
    await expenseClaims.approve(actor, clientId, claim.id);
    const posted = await expenseClaims.post(actor, clientId, claim.id, { paymentAccountId: accounts.cash });
    expect(posted.status).toBe("POSTED");
    await expectBalanced();
  });

  it("rejects posting a claim that hasn't been approved", async () => {
    const employee = await prisma.employee.create({
      data: { clientId, employeeCode: "E2", firstName: "A", lastName: "B", hireDate: new Date("2025-01-01"), baseSalary: 5000 },
    });
    const claim = await expenseClaims.create(actor, clientId, {
      employeeId: employee.id,
      claimNumber: "EXP-T2",
      date: "2026-01-10",
      lines: [{ description: "Taxi", date: "2026-01-09", amount: 40, categoryAccountId: accounts.officeExpense }],
    });
    await expect(expenseClaims.post(actor, clientId, claim.id, { paymentAccountId: accounts.cash })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("PayrollService", () => {
  it("posts a balanced journal for a run with deductions", async () => {
    const employee = await prisma.employee.create({
      data: { clientId, employeeCode: "E3", firstName: "A", lastName: "B", hireDate: new Date("2025-01-01"), baseSalary: 5000 },
    });
    const run = await payroll.create(actor, clientId, {
      periodLabel: "2026-01-P",
      payDate: "2026-01-31",
      lines: [{ employeeId: employee.id, allowances: 200, deductions: 300 }],
    });
    expect(Number(run.totalGross)).toBe(5200);
    expect(Number(run.totalNet)).toBe(4900);

    const posted = await payroll.post(actor, clientId, run.id, {
      salariesExpenseAccountId: accounts.salariesExpense,
      salariesPayableAccountId: accounts.salariesPayable,
      deductionsPayableAccountId: accounts.officeExpense, // reusing an existing account as a stand-in liability
    });
    expect(posted.status).toBe("POSTED");
    await expectBalanced();
  });
});

describe("BankingService", () => {
  it("auto-matches a statement line to the correct GL line by amount and date, and unmatch reverses it", async () => {
    // Post a manual journal that hits the bank account, mimicking a prior transaction.
    const draft = await journals.createDraft(actor, clientId, {
      date: "2026-01-15",
      description: "Bank fee",
      lines: [
        { accountId: accounts.officeExpense, debit: 25, credit: 0 },
        { accountId: accounts.bank, debit: 0, credit: 25 },
      ],
    });
    await journals.post(actor, clientId, draft.id);

    const csv = "date,description,amount,reference\n2026-01-16,Bank fee,-25,REF1\n";
    const importRow = await banking.importStatement(actor, clientId, accounts.bank, {
      originalname: "statement.csv",
      buffer: Buffer.from(csv),
    });
    expect(importRow.lines).toHaveLength(1);

    const result = await banking.autoMatch(actor, clientId, { bankAccountId: accounts.bank, dateWindowDays: 5 });
    expect(result.matchedCount).toBe(1);

    const line = await prisma.bankStatementLine.findFirstOrThrow({ where: { importId: importRow.id } });
    expect(line.status).toBe("MATCHED");

    await banking.unmatch(actor, clientId, line.id);
    const unmatchedLine = await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(unmatchedLine.status).toBe("UNMATCHED");
    expect(unmatchedLine.matchedJournalLineId).toBeNull();
  });

  it("create-transaction-from-line posts a balanced journal and matches immediately", async () => {
    const csv = "date,description,amount,reference\n2026-01-20,Interest,5.50,REF2\n";
    const importRow = await banking.importStatement(actor, clientId, accounts.bank, {
      originalname: "statement2.csv",
      buffer: Buffer.from(csv),
    });
    const line = importRow.lines[0];

    await banking.createTransactionFromLine(actor, clientId, line.id, {
      description: "Bank interest",
      offsetAccountId: accounts.gain,
    });
    await expectBalanced();

    const updatedLine = await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(updatedLine.status).toBe("MATCHED");
  });
});
