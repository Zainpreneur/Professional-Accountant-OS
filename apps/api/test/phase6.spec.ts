import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@accountant-os/db";
import { BadRequestException } from "@nestjs/common";
import { AuditService } from "../src/audit/audit.service";
import { BusinessCompilerService } from "../src/business-compiler/business-compiler.service";
import { ClientsService } from "../src/clients/clients.service";
import { compileCoa, resolveBusinessCategory, resolveJurisdiction, UnknownTemplateError } from "../src/business-compiler/compile";
import { BUSINESS_CATEGORY_TEMPLATES } from "../src/business-compiler/templates/business-category-templates";
import { JURISDICTION_PACKS } from "../src/business-compiler/templates/jurisdiction-packs";
import type { RequestUser } from "../src/common/types";

// Integration tests for Phase 6 (Business Compiler): chart-of-accounts
// composition per business category/jurisdiction combination, and the
// end-to-end client onboarding flow that consumes it.
const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const businessCompiler = new BusinessCompilerService();
const clients = new ClientsService(prisma as any, audit, businessCompiler);

let actor: RequestUser;

async function makeFixture() {
  const suffix = randomUUID().slice(0, 8);
  const firm = await prisma.firm.create({ data: { name: `P6 Test Firm ${suffix}` } });
  const user = await prisma.user.create({
    data: { firmId: firm.id, email: `p6-${suffix}@example.test`, passwordHash: "x", firstName: "T", lastName: "U", status: "ACTIVE" },
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

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await makeFixture();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("resolveBusinessCategory / resolveJurisdiction", () => {
  it("defaults to PROFESSIONAL_SERVICES and SA when nothing is given", () => {
    expect(resolveBusinessCategory(undefined)).toBe("PROFESSIONAL_SERVICES");
    expect(resolveBusinessCategory(null)).toBe("PROFESSIONAL_SERVICES");
    expect(resolveJurisdiction(undefined)).toBe("SA");
  });

  it("normalizes case", () => {
    expect(resolveBusinessCategory("retail")).toBe("RETAIL");
    expect(resolveJurisdiction("ae")).toBe("AE");
  });

  it("rejects an unknown category or jurisdiction", () => {
    expect(() => resolveBusinessCategory("SPACE_MINING")).toThrow(UnknownTemplateError);
    expect(() => resolveJurisdiction("MARS")).toThrow(UnknownTemplateError);
  });
});

describe("compileCoa", () => {
  it("gives the pure baseline (no category or tax accounts) for PROFESSIONAL_SERVICES + OTHER", () => {
    const { accounts } = compileCoa("PROFESSIONAL_SERVICES", "OTHER");
    const codes = accounts.map((a) => a.code);
    expect(codes).not.toContain("1300"); // VAT Input
    expect(codes).not.toContain("2500"); // WHT Payable
    expect(codes).not.toContain("2600"); // Zakat Payable
    expect(accounts.some((a) => a.name.includes("Merchandise"))).toBe(false);
  });

  it("adds VAT + WHT + Zakat accounts and retail accounts for RETAIL + SA", () => {
    const { accounts } = compileCoa("RETAIL", "SA");
    const names = accounts.map((a) => a.name);
    expect(names).toEqual(expect.arrayContaining(["VAT Input (Recoverable)", "VAT Output (Payable)", "Withholding Tax Payable", "Zakat Payable"]));
    expect(names).toEqual(expect.arrayContaining(["Merchandise Inventory", "Sales Returns & Allowances", "Merchant / POS Fees"]));
  });

  it("adds VAT but not WHT or Zakat accounts for AE", () => {
    const { accounts } = compileCoa("MANUFACTURING", "AE");
    const names = accounts.map((a) => a.name);
    expect(names).toContain("VAT Input (Recoverable)");
    expect(names).not.toContain("Withholding Tax Payable");
    expect(names).not.toContain("Zakat Payable");
    expect(names).toEqual(expect.arrayContaining(["Raw Materials Inventory", "Work-in-Progress Inventory", "Finished Goods Inventory"]));
  });

  it("never produces a duplicate account code, for any category x jurisdiction combination", () => {
    for (const category of Object.keys(BUSINESS_CATEGORY_TEMPLATES)) {
      for (const jurisdiction of Object.keys(JURISDICTION_PACKS)) {
        const { accounts } = compileCoa(category, jurisdiction);
        const codes = accounts.map((a) => a.code);
        expect(new Set(codes).size).toBe(codes.length);
      }
    }
  });

  it("throws for an unrecognized category or jurisdiction rather than silently falling back", () => {
    expect(() => compileCoa("NOT_REAL", "SA")).toThrow(UnknownTemplateError);
    expect(() => compileCoa("RETAIL", "NOT_REAL")).toThrow(UnknownTemplateError);
  });
});

describe("ClientsService.create() via the Business Compiler", () => {
  it("normalizes category/jurisdiction and seeds the composed chart of accounts", async () => {
    const client = await clients.create(actor, { legalName: `Construction Co ${randomUUID().slice(0, 6)}`, businessCategory: "construction", jurisdiction: "sa" });
    expect(client.businessCategory).toBe("CONSTRUCTION");
    expect(client.jurisdiction).toBe("SA");

    const accounts = await prisma.chartOfAccount.findMany({ where: { clientId: client.id } });
    const names = accounts.map((a) => a.name);
    expect(names).toContain("Retention Receivable");
    expect(names).toContain("Zakat Payable"); // SA jurisdiction
    expect(names).not.toContain("Merchandise Inventory"); // not a retail account
  });

  it("defaults baseCurrency from the jurisdiction pack when not given", async () => {
    const client = await clients.create(actor, { legalName: `AE Co ${randomUUID().slice(0, 6)}`, jurisdiction: "AE" });
    expect(client.baseCurrency).toBe("AED");
  });

  it("respects an explicit baseCurrency override", async () => {
    const client = await clients.create(actor, { legalName: `Custom Currency Co ${randomUUID().slice(0, 6)}`, jurisdiction: "AE", baseCurrency: "USD" });
    expect(client.baseCurrency).toBe("USD");
  });

  it("also seeds a fiscal year and 12 accounting periods, unchanged from before", async () => {
    const client = await clients.create(actor, { legalName: `Periods Co ${randomUUID().slice(0, 6)}` });
    const periods = await prisma.accountingPeriod.findMany({ where: { clientId: client.id } });
    expect(periods).toHaveLength(12);
  });

  it("rejects client creation for an unknown business category before writing anything", async () => {
    await expect(clients.create(actor, { legalName: `Bad Co ${randomUUID().slice(0, 6)}`, businessCategory: "SPACE_MINING" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects client creation for an unknown jurisdiction before writing anything", async () => {
    await expect(clients.create(actor, { legalName: `Bad Co 2 ${randomUUID().slice(0, 6)}`, jurisdiction: "MARS" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("BusinessCompilerService catalog", () => {
  it("lists all 6 business categories and 3 jurisdictions", () => {
    expect(businessCompiler.listCategories()).toHaveLength(6);
    expect(businessCompiler.listJurisdictions()).toHaveLength(3);
  });
});
