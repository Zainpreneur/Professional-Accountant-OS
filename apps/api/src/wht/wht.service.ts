import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RegulatoryRulesService } from "../regulatory-rules/regulatory-rules.service";
import type { CalculateWhtDto, GenerateWhtReturnDto } from "./dto/wht.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Withholding Tax (SRS 28). WHT itself is accrued at Payment time (see
// PaymentsService); this service provides the pre-payment calculation
// preview (via the regulatory rules engine, using the client's own
// jurisdiction rather than a hard-coded one) and the period-return summary.
@Injectable()
export class WhtService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rules: RegulatoryRulesService,
  ) {}

  async calculate(clientId: string, dto: CalculateWhtDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException("Client not found");

    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || supplier.clientId !== clientId) throw new BadRequestException("Supplier not found");

    if (!supplier.whtCategoryCode) {
      return { applicable: false, whtAmount: 0, netAmount: dto.amount };
    }

    const rule = await this.rules.resolve(client.jurisdiction, "WHT_RATE", supplier.whtCategoryCode, new Date(dto.date));
    const whtAmount = round2(dto.amount * (Number(rule.rate) / 100));

    return {
      applicable: true,
      categoryCode: supplier.whtCategoryCode,
      categoryName: rule.name,
      rate: Number(rule.rate),
      ruleId: rule.id,
      whtAmount,
      netAmount: round2(dto.amount - whtAmount),
    };
  }

  list(clientId: string) {
    return this.prisma.whtReturn.findMany({ where: { clientId }, include: { taxPeriod: true }, orderBy: { createdAt: "desc" } });
  }

  async generate(actor: RequestUser, clientId: string, dto: GenerateWhtReturnDto) {
    const existing = await this.prisma.whtReturn.findUnique({ where: { taxPeriodId: dto.taxPeriodId } });
    if (existing) throw new BadRequestException("A WHT return already exists for this period");

    const taxPeriod = await this.prisma.taxPeriod.findUnique({ where: { id: dto.taxPeriodId } });
    if (!taxPeriod || taxPeriod.clientId !== clientId) throw new NotFoundException("Tax period not found");
    if (taxPeriod.periodType !== "WHT") throw new BadRequestException("Tax period is not a WHT period");

    const payments = await this.prisma.payment.findMany({
      where: {
        clientId,
        type: "PAYMENT",
        whtAmount: { gt: 0 },
        date: { gte: taxPeriod.startDate, lte: taxPeriod.endDate },
      },
    });

    const byCategory = new Map<string, number>();
    for (const p of payments) {
      const key = p.whtCategoryCode ?? "UNSPECIFIED";
      byCategory.set(key, round2((byCategory.get(key) ?? 0) + Number(p.whtAmount)));
    }
    const totalWht = round2([...byCategory.values()].reduce((s, v) => s + v, 0));
    const breakdown = [...byCategory.entries()].map(([categoryCode, amount]) => ({ categoryCode, amount }));

    const whtReturn = await this.prisma.whtReturn.create({
      data: { clientId, taxPeriodId: dto.taxPeriodId, totalWht, breakdown, status: "DRAFT" },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "WHT_RETURN_GENERATED",
      entityType: "WhtReturn",
      entityId: whtReturn.id,
      after: whtReturn,
    });
    return whtReturn;
  }

  async file(actor: RequestUser, clientId: string, whtReturnId: string) {
    const whtReturn = await this.prisma.whtReturn.findUnique({ where: { id: whtReturnId } });
    if (!whtReturn || whtReturn.clientId !== clientId) throw new NotFoundException("WHT return not found");
    if (whtReturn.status !== "DRAFT") throw new BadRequestException("Only a draft WHT return can be filed");

    const filed = await this.prisma.whtReturn.update({
      where: { id: whtReturnId },
      data: { status: "FILED", filedById: actor.id, filedAt: new Date() },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "WHT_RETURN_FILED",
      entityType: "WhtReturn",
      entityId: whtReturnId,
    });
    return filed;
  }
}
