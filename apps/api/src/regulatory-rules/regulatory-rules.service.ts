import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateRegulatoryRuleDto } from "./dto/regulatory-rule.dto";
import type { RequestUser } from "../common/types";

export type RuleType = "VAT_RATE" | "WHT_RATE" | "ZAKAT_RATE";

// Regulatory Rules Engine (SRS 58): "Jurisdiction + Authority + Regulation +
// Version + Effective Date + Rule + Exception + Calculation" as versioned
// data, never a hard-coded percentage in a service file. Global, not
// client-scoped - a jurisdiction's VAT rate is a fact about that
// jurisdiction, not about any one firm's client. In a real multi-tenant
// deployment this would likely be platform-admin-managed rather than
// per-firm-editable; here it's gated by MANAGE_REGULATORY_RULES, which only
// FIRM_OWNER/PARTNER hold by default.
@Injectable()
export class RegulatoryRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(jurisdiction?: string, ruleType?: string) {
    return this.prisma.regulatoryRule.findMany({
      where: { ...(jurisdiction ? { jurisdiction } : {}), ...(ruleType ? { ruleType: ruleType as any } : {}) },
      orderBy: [{ ruleType: "asc" }, { code: "asc" }, { effectiveFrom: "desc" }],
    });
  }

  // The one method every tax calculation in the app calls instead of
  // hard-coding a percentage: "what rate applied to (jurisdiction,
  // ruleType, code) on this date?"
  async resolve(jurisdiction: string, ruleType: RuleType, code: string, asOf: Date) {
    const rule = await this.prisma.regulatoryRule.findFirst({
      where: {
        jurisdiction,
        ruleType,
        code,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!rule) {
      throw new NotFoundException(
        `No ${ruleType} rule found for ${jurisdiction}/${code} effective ${asOf.toISOString().slice(0, 10)}`,
      );
    }
    return rule;
  }

  // Creates a new version of a rule. If an open-ended (effectiveTo = null)
  // rule already exists for the same (jurisdiction, ruleType, code) and
  // started before this one, it's automatically closed off the day before
  // this rule starts - so there is never an ambiguous overlap to resolve
  // against.
  async create(actor: RequestUser, dto: CreateRegulatoryRuleDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);

    const rule = await this.prisma.$transaction(async (tx) => {
      const openPredecessor = await tx.regulatoryRule.findFirst({
        where: {
          jurisdiction: dto.jurisdiction,
          ruleType: dto.ruleType as any,
          code: dto.code,
          effectiveTo: null,
          effectiveFrom: { lt: effectiveFrom },
        },
      });
      if (openPredecessor) {
        const dayBefore = new Date(effectiveFrom);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
        await tx.regulatoryRule.update({ where: { id: openPredecessor.id }, data: { effectiveTo: dayBefore } });
      }

      return tx.regulatoryRule.create({
        data: {
          jurisdiction: dto.jurisdiction,
          authority: dto.authority,
          ruleType: dto.ruleType as any,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          rate: dto.rate,
          effectiveFrom,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });
    });

    await this.audit.log({
      firmId: actor.firmId,
      userId: actor.id,
      action: "REGULATORY_RULE_CREATED",
      entityType: "RegulatoryRule",
      entityId: rule.id,
      after: rule,
    });
    return rule;
  }
}
