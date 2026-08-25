import type { AccountType, ControlAccountType, NormalBalance, Prisma } from "@accountant-os/db";

export type TemplateAccount = Omit<Prisma.ChartOfAccountCreateManyInput, "clientId">;

export function acct(
  code: string,
  name: string,
  type: AccountType,
  subtype: string,
  normalBalance: NormalBalance,
  isControlAccount = false,
  controlAccountType?: ControlAccountType,
  reconciliationRequired = false,
): TemplateAccount {
  return {
    code,
    name,
    type,
    subtype,
    normalBalance,
    isControlAccount,
    controlAccountType: controlAccountType ?? null,
    reconciliationRequired,
  };
}

// The jurisdiction- and business-category-agnostic starter chart of
// accounts (SRS 12, 60). Every client gets this layer regardless of
// jurisdiction or business category; BusinessCompilerService layers a
// jurisdiction pack (VAT/WHT/Zakat control accounts, only where that
// jurisdiction actually needs them) and a business-category template
// (industry-specific accounts) on top of it (see
// business-compiler.service.ts). Deliberately does NOT include
// VAT_INPUT/VAT_OUTPUT/WHT Payable/Zakat Payable - those are Saudi-specific
// and belong to the SA jurisdiction pack, not every client everywhere
// (this used to be baked into a single unconditional template - see the
// Phase 6 note in docs/ARCHITECTURE.md).
export const BASE_COA_TEMPLATE: TemplateAccount[] = [
  // Assets
  acct("1000", "Cash on Hand", "ASSET", "Cash", "DEBIT", true, "CASH"),
  acct("1100", "Bank Account", "ASSET", "Bank", "DEBIT", true, "BANK"),
  acct("1200", "Accounts Receivable", "ASSET", "Receivables", "DEBIT", true, "ACCOUNTS_RECEIVABLE", true),
  acct("1400", "Inventory", "ASSET", "Inventory", "DEBIT"),
  acct("1500", "Prepaid Expenses", "ASSET", "Current Assets", "DEBIT"),
  acct("1600", "Fixed Assets", "ASSET", "Non-current Assets", "DEBIT"),
  acct("1650", "Accumulated Depreciation", "ASSET", "Non-current Assets", "CREDIT"),

  // Liabilities
  acct("2100", "Accounts Payable", "LIABILITY", "Payables", "CREDIT", true, "ACCOUNTS_PAYABLE", true),
  acct("2300", "Accrued Expenses", "LIABILITY", "Current Liabilities", "CREDIT"),
  acct("2400", "Salaries Payable", "LIABILITY", "Payroll", "CREDIT"),

  // Equity
  acct("3000", "Share Capital", "EQUITY", "Capital", "CREDIT"),
  acct("3100", "Retained Earnings", "EQUITY", "Retained Earnings", "CREDIT"),

  // Revenue
  acct("4000", "Sales Revenue", "REVENUE", "Operating Revenue", "CREDIT"),
  acct("4100", "Service Revenue", "REVENUE", "Operating Revenue", "CREDIT"),
  acct("4900", "Other Income", "REVENUE", "Other", "CREDIT"),

  // Expenses
  acct("5000", "Cost of Goods Sold", "EXPENSE", "COGS", "DEBIT"),
  acct("5100", "Salaries & Wages", "EXPENSE", "Payroll", "DEBIT"),
  acct("5200", "Rent Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5300", "Utilities Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5400", "Office Supplies", "EXPENSE", "Operating", "DEBIT"),
  acct("5500", "Professional Fees", "EXPENSE", "Operating", "DEBIT"),
  acct("5600", "Depreciation Expense", "EXPENSE", "Operating", "DEBIT"),
  acct("5900", "Other Expenses", "EXPENSE", "Operating", "DEBIT"),
];
