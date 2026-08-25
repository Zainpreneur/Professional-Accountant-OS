import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";
// The canonical permission/role definitions and the Business Compiler both
// live in the API package. Importing them here - rather than keeping
// hand-copied duplicates - means a new permission or template change is
// seeded correctly the moment it's added, with nothing to keep in sync.
import { SYSTEM_ROLES } from "../../../apps/api/src/rbac/permissions";
import { compileCoa } from "../../../apps/api/src/business-compiler/compile";

// Seeds a demo firm with a demo client, ready to explore the API/UI:
//   firm owner login: owner@demo-firm.test / Password123!
// Run with `pnpm db:seed`.
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo firm...");

  const firm = await prisma.firm.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo CA Practice",
      legalName: "Demo Chartered Accountants LLC",
      country: "SA",
    },
  });

  for (const [name, def] of Object.entries(SYSTEM_ROLES)) {
    await prisma.role.upsert({
      where: { firmId_name: { firmId: firm.id, name } },
      update: { permissions: def.permissions, description: def.description },
      create: { firmId: firm.id, name, description: def.description, permissions: def.permissions },
    });
  }
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { firmId_name: { firmId: firm.id, name: "FIRM_OWNER" } } });

  const ownerEmail = "owner@demo-firm.test";
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const owner = await prisma.user.upsert({
    where: { firmId_email: { firmId: firm.id, email: ownerEmail } },
    update: {},
    create: {
      firmId: firm.id,
      email: ownerEmail,
      passwordHash,
      firstName: "Firm",
      lastName: "Owner",
      status: "ACTIVE",
    },
  });
  // Prisma's compound-unique `where` doesn't accept null members, so a
  // firm-wide (clientId = null) assignment has to be upserted by hand.
  const existingOwnerRole = await prisma.userRole.findFirst({
    where: { userId: owner.id, roleId: ownerRole.id, clientId: null },
  });
  if (!existingOwnerRole) {
    await prisma.userRole.create({ data: { userId: owner.id, roleId: ownerRole.id, clientId: null } });
  }

  const client = await prisma.client.upsert({
    where: { firmId_legalName: { firmId: firm.id, legalName: "Demo Retail LLC" } },
    update: {},
    create: {
      firmId: firm.id,
      legalName: "Demo Retail LLC",
      tradingName: "Demo Retail",
      entityType: "LLC",
      businessCategory: "RETAIL",
      jurisdiction: "SA",
      taxRegistrationNumber: "300000000000003",
      baseCurrency: "SAR",
      status: "ACTIVE",
    },
  });

  const existingAccounts = await prisma.chartOfAccount.count({ where: { clientId: client.id } });
  if (existingAccounts === 0) {
    // Composed by the same Business Compiler the API uses at client
    // onboarding (Phase 6) - a Retail/SA client, so this includes the
    // retail-specific accounts and Saudi's VAT/WHT/Zakat accounts.
    const { accounts } = compileCoa(client.businessCategory, client.jurisdiction);
    await prisma.chartOfAccount.createMany({
      data: accounts.map((a) => ({ ...a, clientId: client.id })),
    });
  }

  const now = new Date();
  let fiscalYear = await prisma.fiscalYear.findUnique({
    where: { clientId_name: { clientId: client.id, name: String(now.getUTCFullYear()) } },
  });
  if (!fiscalYear) {
    fiscalYear = await prisma.fiscalYear.create({
      data: {
        clientId: client.id,
        name: String(now.getUTCFullYear()),
        startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        endDate: new Date(Date.UTC(now.getUTCFullYear(), 11, 31)),
      },
    });
    const periods = Array.from({ length: 12 }, (_, i) => ({
      clientId: client.id,
      fiscalYearId: fiscalYear!.id,
      name: `${now.getUTCFullYear()}-${String(i + 1).padStart(2, "0")}`,
      startDate: new Date(Date.UTC(now.getUTCFullYear(), i, 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), i + 1, 0)),
    }));
    await prisma.accountingPeriod.createMany({ data: periods });
  }

  const arAccount = await prisma.chartOfAccount.findFirstOrThrow({
    where: { clientId: client.id, controlAccountType: "ACCOUNTS_RECEIVABLE" },
  });
  await prisma.customer.upsert({
    where: { clientId_code: { clientId: client.id, code: "CUST-001" } },
    update: {},
    create: {
      clientId: client.id,
      code: "CUST-001",
      name: "Acme Trading Co.",
      email: "ap@acme-trading.example",
      arAccountId: arAccount.id,
    },
  });

  const apAccount = await prisma.chartOfAccount.findFirstOrThrow({
    where: { clientId: client.id, controlAccountType: "ACCOUNTS_PAYABLE" },
  });
  await prisma.supplier.upsert({
    where: { clientId_code: { clientId: client.id, code: "SUPP-001" } },
    update: {},
    create: {
      clientId: client.id,
      code: "SUPP-001",
      name: "Riyadh Office Supplies",
      email: "billing@riyadh-supplies.example",
      apAccountId: apAccount.id,
    },
  });

  await seedRegulatoryRules();

  console.log("Seed complete.");
  console.log(`  Firm:  ${firm.name} (${firm.id})`);
  console.log(`  Login: ${ownerEmail} / Password123!`);
  console.log(`  Client: ${client.legalName} (${client.id})`);
}

// Default Saudi regulatory rules (SRS 58, Phase 3). These follow published
// history/typical guidance as a configurable starting point - not vetted
// tax advice; see docs/ARCHITECTURE.md. The VAT_RATE/STANDARD history below
// (5% -> 15% on 2020-07-01) is real public record and doubles as a
// demonstration that the rules engine actually resolves by effective date
// rather than just holding a single current value.
async function seedRegulatoryRules() {
  const rules: Array<{
    jurisdiction: string;
    authority: string;
    ruleType: "VAT_RATE" | "WHT_RATE" | "ZAKAT_RATE";
    code: string;
    name: string;
    description?: string;
    rate: number;
    effectiveFrom: string;
    effectiveTo?: string;
  }> = [
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "VAT_RATE",
      code: "STANDARD",
      name: "Standard VAT rate",
      rate: 5,
      effectiveFrom: "2018-01-01",
      effectiveTo: "2020-06-30",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "VAT_RATE",
      code: "STANDARD",
      name: "Standard VAT rate",
      rate: 15,
      effectiveFrom: "2020-07-01",
    },
    { jurisdiction: "SA", authority: "ZATCA", ruleType: "VAT_RATE", code: "ZERO_RATED", name: "Zero-rated", rate: 0, effectiveFrom: "2018-01-01" },
    { jurisdiction: "SA", authority: "ZATCA", ruleType: "VAT_RATE", code: "EXEMPT", name: "Exempt", rate: 0, effectiveFrom: "2018-01-01" },
    { jurisdiction: "SA", authority: "ZATCA", ruleType: "ZAKAT_RATE", code: "STANDARD", name: "Standard Zakat rate", rate: 2.5, effectiveFrom: "2018-01-01" },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "MANAGEMENT_FEES",
      name: "Management fees",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 20,
      effectiveFrom: "2018-01-01",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "ROYALTIES",
      name: "Royalties",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 15,
      effectiveFrom: "2018-01-01",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "SERVICES",
      name: "Services (general)",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 5,
      effectiveFrom: "2018-01-01",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "RENT",
      name: "Rent",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 5,
      effectiveFrom: "2018-01-01",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "DIVIDENDS",
      name: "Dividends",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 5,
      effectiveFrom: "2018-01-01",
    },
    {
      jurisdiction: "SA",
      authority: "ZATCA",
      ruleType: "WHT_RATE",
      code: "INTEREST",
      name: "Interest / loan charges",
      description: "Approximate published rate - verify against current ZATCA guidance before relying on it.",
      rate: 5,
      effectiveFrom: "2018-01-01",
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.regulatoryRule.findFirst({
      where: {
        jurisdiction: rule.jurisdiction,
        ruleType: rule.ruleType as any,
        code: rule.code,
        effectiveFrom: new Date(rule.effectiveFrom),
      },
    });
    if (existing) continue;
    await prisma.regulatoryRule.create({
      data: {
        jurisdiction: rule.jurisdiction,
        authority: rule.authority,
        ruleType: rule.ruleType as any,
        code: rule.code,
        name: rule.name,
        description: rule.description,
        rate: rule.rate,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
