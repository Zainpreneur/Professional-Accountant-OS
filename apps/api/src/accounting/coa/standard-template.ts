import type { AccountType, ControlAccountType, NormalBalance, Prisma } from "@accountant-os/db";

type TemplateAccount = Omit<Prisma.ChartOfAccountCreateManyInput, "clientId">;

// Generic starter chart of accounts assigned to every new client on
// onboarding (SRS 12: "templates by business category / country / industry
// / entity type"). This is the default template; SRS 60's business-category
// templates and jurisdiction-specific templates are additive layers for a
// later phase (see docs/ARCHITECTURE.md).
export const STANDARD_COA_TEMPLATE: TemplateAccount[] = [
  // Assets
  acct("1000", "Cash on Hand", "ASSET", "Cash", "DEBIT", true, "CASH"),
  acct("1100", "Bank Account", "ASSET", "Bank", "DEBIT", true, "BANK"),
  acct("1200", "Accounts Receivable", "ASSET", "Receivables", "DEBIT", true, "ACCOUNTS_RECEIVABLE", true),
  acct("1300", "VAT Input (Recoverable)", "ASSET", "Tax", "DEBIT", true, "VAT_INPUT"),
  acct("1400", "Inventory", "ASSET", "Inventory", "DEBIT"),
  acct("1500", "Prepaid Expenses", "ASSET", "Current Assets", "DEBIT"),
  acct("1600", "Fixed Assets", "ASSET", "Non-current Assets", "DEBIT"),
  acct("1650", "Accumulated Depreciation", "ASSET", "Non-current Assets", "CREDIT"),

  // Liabilities
  acct("2100", "Accounts Payable", "LIABILITY", "Payables", "CREDIT", true, "ACCOUNTS_PAYABLE", true),
  acct("2200", "VAT Output (Payable)", "LIABILITY", "Tax", "CREDIT", true, "VAT_OUTPUT"),
  acct("2300", "Accrued Expenses", "LIABILITY", "Current Liabilities", "CREDIT"),
  acct("2400", "Salaries Payable", "LIABILITY", "Payroll", "CREDIT"),
  acct("2500", "Withholding Tax Payable", "LIABILITY", "Tax", "CREDIT"),
  acct("2600", "Zakat Payable", "LIABILITY", "Tax", "CREDIT"),

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

function acct(
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
