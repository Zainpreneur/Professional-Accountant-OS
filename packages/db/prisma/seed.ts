import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";
// The canonical permission/role definitions live in the API package
// (apps/api/src/rbac/permissions.ts). Importing them here - rather than
// keeping a second hand-copied list - means a new permission is seeded
// correctly the moment it's added, with nothing to keep in sync.
import { SYSTEM_ROLES } from "../../../apps/api/src/rbac/permissions";

// Seeds a demo firm with a demo client, ready to explore the API/UI:
//   firm owner login: owner@demo-firm.test / Password123!
// Run with `pnpm db:seed`.
const prisma = new PrismaClient();

const STANDARD_COA_TEMPLATE = [
  acct("1000", "Cash on Hand", "ASSET", "Cash", "DEBIT", true, "CASH"),
  acct("1100", "Bank Account", "ASSET", "Bank", "DEBIT", true, "BANK"),
  acct("1200", "Accounts Receivable", "ASSET", "Receivables", "DEBIT", true, "ACCOUNTS_RECEIVABLE", true),
  acct("1300", "VAT Input (Recoverable)", "ASSET", "Tax", "DEBIT", true, "VAT_INPUT"),
  acct("1400", "Inventory", "ASSET", "Inventory", "DEBIT"),
  acct("1500", "Prepaid Expenses", "ASSET", "Current Assets", "DEBIT"),
  acct("1600", "Fixed Assets", "ASSET", "Non-current Assets", "DEBIT"),
  acct("1650", "Accumulated Depreciation", "ASSET", "Non-current Assets", "CREDIT"),
  acct("2100", "Accounts Payable", "LIABILITY", "Payables", "CREDIT", true, "ACCOUNTS_PAYABLE", true),
  acct("2200", "VAT Output (Payable)", "LIABILITY", "Tax", "CREDIT", true, "VAT_OUTPUT"),
  acct("2300", "Accrued Expenses", "LIABILITY", "Current Liabilities", "CREDIT"),
  acct("2400", "Salaries Payable", "LIABILITY", "Payroll", "CREDIT"),
  acct("2500", "Withholding Tax Payable", "LIABILITY", "Tax", "CREDIT"),
  acct("2600", "Zakat Payable", "LIABILITY", "Tax", "CREDIT"),
  acct("3000", "Share Capital", "EQUITY", "Capital", "CREDIT"),
  acct("3100", "Retained Earnings", "EQUITY", "Retained Earnings", "CREDIT"),
  acct("4000", "Sales Revenue", "REVENUE", "Operating Revenue", "CREDIT"),
  acct("4100", "Service Revenue", "REVENUE", "Operating Revenue", "CREDIT"),
  acct("4900", "Other Income", "REVENUE", "Other", "CREDIT"),
  acct("5000", "Cost of Goods Sold", "EXPENSE", "COGS", "DEBIT"),
  acct("5100", "Salaries & Wages", "EXPENSE", "Payroll", "DEBIT"),
  acct("5200", "Rent Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5300", "Utilities Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5400", "Office Supplies", "EXPENSE", "Operating", "DEBIT"),
  acct("5500", "Professional Fees", "EXPENSE", "Operating", "DEBIT"),
  acct("5600", "Depreciation Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5900", "Other Expenses", "EXPENSE", "Operating", "DEBIT"),
];

function acct(
  code: string,
  name: string,
  type: string,
  subtype: string,
  normalBalance: string,
  isControlAccount = false,
  controlAccountType?: string,
  reconciliationRequired = false,
) {
  return {
    code,
    name,
    type: type as any,
    subtype,
    normalBalance: normalBalance as any,
    isControlAccount,
    controlAccountType: (controlAccountType ?? null) as any,
    reconciliationRequired,
  };
}

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
      businessCategory: "Retail",
      jurisdiction: "SA",
      taxRegistrationNumber: "300000000000003",
      baseCurrency: "SAR",
      status: "ACTIVE",
    },
  });

  const existingAccounts = await prisma.chartOfAccount.count({ where: { clientId: client.id } });
  if (existingAccounts === 0) {
    await prisma.chartOfAccount.createMany({
      data: STANDARD_COA_TEMPLATE.map((a) => ({ ...a, clientId: client.id })),
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

  console.log("Seed complete.");
  console.log(`  Firm:  ${firm.name} (${firm.id})`);
  console.log(`  Login: ${ownerEmail} / Password123!`);
  console.log(`  Client: ${client.legalName} (${client.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
