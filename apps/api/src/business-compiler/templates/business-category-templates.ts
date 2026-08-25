import { acct, type TemplateAccount } from "./base-coa-template";

export interface BusinessCategoryTemplate {
  code: string;
  label: string;
  description: string;
  extraAccounts: TemplateAccount[];
}

// Business Category Templates (SRS 60). A representative slice of SRS 60's
// example list (Plant Nursery, Car Wash, Laundry, Barber Shop, Furniture
// Store, Grocery, Restaurant, Construction, Manufacturing, Software
// Agency, Professional Services, Retail, Wholesale, Healthcare,
// Education) - 6 categories spanning simple-service to complex-inventory
// business models, not all 15. Each layers a handful of genuinely
// industry-specific accounts on top of BASE_COA_TEMPLATE; nothing here
// invents an accounting treatment - these are ordinary accounts a
// bookkeeper in that industry would expect to see, just not needed by
// every business.
export const BUSINESS_CATEGORY_TEMPLATES: Record<string, BusinessCategoryTemplate> = {
  PROFESSIONAL_SERVICES: {
    code: "PROFESSIONAL_SERVICES",
    label: "Professional Services",
    description: "Consulting, legal, accounting, and other fee-for-service firms - the baseline template, no extra accounts.",
    extraAccounts: [],
  },
  RETAIL: {
    code: "RETAIL",
    label: "Retail",
    description: "Shops selling physical goods to consumers.",
    extraAccounts: [
      acct("1810", "Merchandise Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("4200", "Sales Returns & Allowances", "REVENUE", "Contra-revenue", "DEBIT"),
      acct("5810", "Merchant / POS Fees", "EXPENSE", "Operating", "DEBIT"),
    ],
  },
  RESTAURANT: {
    code: "RESTAURANT",
    label: "Restaurant",
    description: "Food service businesses, including delivery/takeout.",
    extraAccounts: [
      acct("1820", "Food & Beverage Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("2810", "Tips Payable", "LIABILITY", "Current Liabilities", "CREDIT"),
      acct("5820", "Kitchen Supplies Expense", "EXPENSE", "Operating", "DEBIT"),
      acct("5821", "Delivery Platform Commission Expense", "EXPENSE", "Operating", "DEBIT"),
    ],
  },
  CONSTRUCTION: {
    code: "CONSTRUCTION",
    label: "Construction",
    description: "Contractors and builders working on long-running, retention-bearing projects.",
    extraAccounts: [
      acct("1830", "Work-in-Progress", "ASSET", "Current Assets", "DEBIT"),
      acct("1831", "Retention Receivable", "ASSET", "Receivables", "DEBIT"),
      acct("2820", "Retention Payable", "LIABILITY", "Current Liabilities", "CREDIT"),
      acct("5830", "Subcontractor Costs", "EXPENSE", "COGS", "DEBIT"),
      acct("5831", "Equipment Rental Expense", "EXPENSE", "Operating", "DEBIT"),
    ],
  },
  MANUFACTURING: {
    code: "MANUFACTURING",
    label: "Manufacturing",
    description: "Businesses converting raw materials into finished goods.",
    extraAccounts: [
      acct("1840", "Raw Materials Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("1841", "Work-in-Progress Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("1842", "Finished Goods Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("5840", "Factory Overhead", "EXPENSE", "COGS", "DEBIT"),
      acct("5841", "Direct Labor", "EXPENSE", "COGS", "DEBIT"),
    ],
  },
  HEALTHCARE: {
    code: "HEALTHCARE",
    label: "Healthcare",
    description: "Clinics and practices billing insurers as well as patients.",
    extraAccounts: [
      acct("1850", "Medical Supplies Inventory", "ASSET", "Inventory", "DEBIT"),
      acct("1851", "Insurance Claims Receivable", "ASSET", "Receivables", "DEBIT"),
      acct("2830", "Patient Refunds Payable", "LIABILITY", "Current Liabilities", "CREDIT"),
      acct("5850", "Malpractice Insurance Expense", "EXPENSE", "Operating", "DEBIT"),
    ],
  },
};

export const DEFAULT_BUSINESS_CATEGORY = "PROFESSIONAL_SERVICES";
