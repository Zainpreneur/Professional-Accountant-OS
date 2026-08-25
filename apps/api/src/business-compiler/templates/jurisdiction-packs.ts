import { acct, type TemplateAccount } from "./base-coa-template";

export interface JurisdictionPack {
  code: string;
  label: string;
  currency: string;
  requiresVat: boolean;
  requiresWht: boolean;
  requiresZakat: boolean;
  extraAccounts: TemplateAccount[];
}

// Jurisdiction packs (SRS 59-60): what a client's chart of accounts needs
// on top of the base template purely because of *where* it operates - the
// tax regime accounts, not the industry ones (that's
// business-category-templates.ts). Deliberately only 3 packs, not a
// jurisdiction for every country: SA is this app's one real, fully-modeled
// jurisdiction (Phase 3's RegulatoryRulesService only has real seeded
// rates for "SA" - see docs/ARCHITECTURE.md); AE demonstrates a
// VAT-only regime (no Zakat, no WHT) without fabricating rates this app
// can't back with real regulatory content; OTHER is the honest fallback
// for anywhere else - no tax-specific accounts are added, rather than
// guessing at a regime this app has no real rules for.
export const JURISDICTION_PACKS: Record<string, JurisdictionPack> = {
  SA: {
    code: "SA",
    label: "Saudi Arabia",
    currency: "SAR",
    requiresVat: true,
    requiresWht: true,
    requiresZakat: true,
    extraAccounts: [
      acct("1300", "VAT Input (Recoverable)", "ASSET", "Tax", "DEBIT", true, "VAT_INPUT"),
      acct("2200", "VAT Output (Payable)", "LIABILITY", "Tax", "CREDIT", true, "VAT_OUTPUT"),
      acct("2500", "Withholding Tax Payable", "LIABILITY", "Tax", "CREDIT"),
      acct("2600", "Zakat Payable", "LIABILITY", "Tax", "CREDIT"),
    ],
  },
  AE: {
    code: "AE",
    label: "United Arab Emirates",
    currency: "AED",
    requiresVat: true,
    requiresWht: false,
    requiresZakat: false,
    extraAccounts: [
      acct("1300", "VAT Input (Recoverable)", "ASSET", "Tax", "DEBIT", true, "VAT_INPUT"),
      acct("2200", "VAT Output (Payable)", "LIABILITY", "Tax", "CREDIT", true, "VAT_OUTPUT"),
    ],
  },
  OTHER: {
    code: "OTHER",
    label: "Other / not yet modeled",
    currency: "USD",
    requiresVat: false,
    requiresWht: false,
    requiresZakat: false,
    extraAccounts: [],
  },
};

export const DEFAULT_JURISDICTION = "SA";
