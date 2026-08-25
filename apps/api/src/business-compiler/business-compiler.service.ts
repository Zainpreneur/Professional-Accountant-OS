import { BadRequestException, Injectable } from "@nestjs/common";
import { BUSINESS_CATEGORY_TEMPLATES } from "./templates/business-category-templates";
import { JURISDICTION_PACKS } from "./templates/jurisdiction-packs";
import {
  compileCoa,
  resolveBusinessCategory as resolveBusinessCategoryOrThrow,
  resolveJurisdiction as resolveJurisdictionOrThrow,
  UnknownTemplateError,
  type CompiledCoa,
} from "./compile";

// Business Compiler (SRS 59-60). This app's slice of the full compiler
// vision is deliberately narrow - chart-of-accounts composition only, not
// SRS 59's full output list (forms/workflows/dashboards/reports/
// permissions/AI agents per business - see docs/ARCHITECTURE.md's
// deliberate simplifications for what's not built). It replaces the
// single fixed template every client used to get regardless of
// jurisdiction or industry (see git history / ARCHITECTURE.md). The
// actual composition logic lives in compile.ts as plain functions so
// packages/db/prisma/seed.ts can call the exact same code, not a
// hand-copied duplicate - this class just adapts it to NestJS DI/HTTP
// error conventions.
@Injectable()
export class BusinessCompilerService {
  listCategories() {
    return Object.values(BUSINESS_CATEGORY_TEMPLATES).map(({ code, label, description, extraAccounts }) => ({
      code,
      label,
      description,
      extraAccountCount: extraAccounts.length,
    }));
  }

  listJurisdictions() {
    return Object.values(JURISDICTION_PACKS).map(({ code, label, currency, requiresVat, requiresWht, requiresZakat, extraAccounts }) => ({
      code,
      label,
      currency,
      requiresVat,
      requiresWht,
      requiresZakat,
      extraAccountCount: extraAccounts.length,
    }));
  }

  // The jurisdiction pack's default currency (e.g. SAR for SA, AED for AE)
  // - used as the client's baseCurrency when the caller doesn't specify one.
  defaultCurrencyFor(jurisdiction: string): string {
    return JURISDICTION_PACKS[jurisdiction]?.currency ?? "USD";
  }

  resolveBusinessCategory(input?: string | null): string {
    try {
      return resolveBusinessCategoryOrThrow(input);
    } catch (err) {
      if (err instanceof UnknownTemplateError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  resolveJurisdiction(input?: string | null): string {
    try {
      return resolveJurisdictionOrThrow(input);
    } catch (err) {
      if (err instanceof UnknownTemplateError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  compile(businessCategoryInput?: string | null, jurisdictionInput?: string | null): CompiledCoa {
    try {
      return compileCoa(businessCategoryInput, jurisdictionInput);
    } catch (err) {
      if (err instanceof UnknownTemplateError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
