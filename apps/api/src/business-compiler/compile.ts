// Plain (no NestJS/DI) implementation of the Business Compiler's chart-of-
// accounts composition, so it can be shared verbatim by
// business-compiler.service.ts (the API's injectable wrapper) and
// packages/db/prisma/seed.ts (a plain script, same relative-import pattern
// already used there for apps/api/src/rbac/permissions.ts) - one real
// implementation, not two copies that can drift.
import { BASE_COA_TEMPLATE, type TemplateAccount } from "./templates/base-coa-template";
import { BUSINESS_CATEGORY_TEMPLATES, DEFAULT_BUSINESS_CATEGORY } from "./templates/business-category-templates";
import { DEFAULT_JURISDICTION, JURISDICTION_PACKS } from "./templates/jurisdiction-packs";

export class UnknownTemplateError extends Error {}

export function resolveBusinessCategory(input?: string | null): string {
  const code = (input || DEFAULT_BUSINESS_CATEGORY).toUpperCase();
  if (!BUSINESS_CATEGORY_TEMPLATES[code]) {
    throw new UnknownTemplateError(
      `Unknown business category "${input}". Known categories: ${Object.keys(BUSINESS_CATEGORY_TEMPLATES).join(", ")}`,
    );
  }
  return code;
}

export function resolveJurisdiction(input?: string | null): string {
  const code = (input || DEFAULT_JURISDICTION).toUpperCase();
  if (!JURISDICTION_PACKS[code]) {
    throw new UnknownTemplateError(`Unknown jurisdiction "${input}". Known jurisdictions: ${Object.keys(JURISDICTION_PACKS).join(", ")}`);
  }
  return code;
}

export interface CompiledCoa {
  businessCategory: string;
  jurisdiction: string;
  accounts: TemplateAccount[];
}

// Composes the chart of accounts a new client gets on onboarding (SRS 6,
// 59-60): the jurisdiction- and category-agnostic base, plus the
// jurisdiction pack's tax accounts (only if that jurisdiction actually
// needs them - a non-VAT jurisdiction's client gets no VAT accounts at
// all), plus the business category's industry accounts. Layers are merged
// by account code so a template collision is a loud bug, not a silent
// "last one wins" - see the templates/ files for how codes are
// partitioned to avoid that in the first place.
export function compileCoa(businessCategoryInput?: string | null, jurisdictionInput?: string | null): CompiledCoa {
  const businessCategory = resolveBusinessCategory(businessCategoryInput);
  const jurisdiction = resolveJurisdiction(jurisdictionInput);

  const layers: Array<[string, TemplateAccount[]]> = [
    ["base", BASE_COA_TEMPLATE],
    [`jurisdiction:${jurisdiction}`, JURISDICTION_PACKS[jurisdiction].extraAccounts],
    [`category:${businessCategory}`, BUSINESS_CATEGORY_TEMPLATES[businessCategory].extraAccounts],
  ];

  const byCode = new Map<string, TemplateAccount>();
  for (const [layerName, accounts] of layers) {
    for (const account of accounts) {
      if (byCode.has(account.code)) {
        throw new Error(`Business Compiler template bug: account code ${account.code} defined in more than one layer (latest: ${layerName})`);
      }
      byCode.set(account.code, account);
    }
  }

  return { businessCategory, jurisdiction, accounts: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code)) };
}
