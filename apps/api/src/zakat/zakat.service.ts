import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import { RegulatoryRulesService } from "../regulatory-rules/regulatory-rules.service";
import type { AddZakatAdjustmentDto, CreateZakatReturnDto, FileZakatReturnDto } from "./dto/zakat.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Zakat Engine (SRS 27) - the commonly-published "net worth" method as a
// configurable starting point, not vetted tax advice (docs/ARCHITECTURE.md):
//   zakatBase = equity + additions - netFixedAssets - deductions
//   zakatDue  = max(zakatBase, 0) * zakatRate
// `equity` and `netFixedAssets` are computed live from the ledger/asset
// register; everything else a real Zakat computation needs (financing
// classification of long-term liabilities, investments in other entities,
// etc.) is entered as an explicit ZakatAdjustment line, so the return is
// auditable line-by-line rather than a black-box number.
@Injectable()
export class ZakatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
    private readonly rules: RegulatoryRulesService,
  ) {}

  list(clientId: string) {
    return this.prisma.zakatReturn.findMany({
      where: { clientId },
      include: { taxPeriod: true, adjustments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(clientId: string, zakatReturnId: string) {
    const zakatReturn = await this.prisma.zakatReturn.findUnique({
      where: { id: zakatReturnId },
      include: { taxPeriod: true, adjustments: true, journal: { include: { lines: true } } },
    });
    if (!zakatReturn || zakatReturn.clientId !== clientId) throw new NotFoundException("Zakat return not found");
    return zakatReturn;
  }

  private async computeEquity(clientId: string, asOf: Date) {
    const sums = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      where: { journal: { clientId, status: { in: ["POSTED", "REVERSED"] }, date: { lte: asOf } }, account: { type: "EQUITY" } },
      _sum: { debit: true, credit: true },
    });
    return round2(sums.reduce((total, s) => total + Number(s._sum.credit ?? 0) - Number(s._sum.debit ?? 0), 0));
  }

  private async computeNetFixedAssets(clientId: string, asOf: Date) {
    const assets = await this.prisma.fixedAsset.findMany({
      where: { clientId, status: "ACTIVE", acquisitionDate: { lte: asOf } },
    });
    return round2(assets.reduce((total, a) => total + (Number(a.acquisitionCost) - Number(a.accumulatedDepreciation)), 0));
  }

  private computeBase(equity: number, netFixedAssets: number, additionsTotal: number, deductionsTotal: number) {
    return round2(equity + additionsTotal - netFixedAssets - deductionsTotal);
  }

  async create(actor: RequestUser, clientId: string, dto: CreateZakatReturnDto) {
    const existing = await this.prisma.zakatReturn.findUnique({ where: { taxPeriodId: dto.taxPeriodId } });
    if (existing) throw new BadRequestException("A Zakat return already exists for this period");

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException("Client not found");
    const taxPeriod = await this.prisma.taxPeriod.findUnique({ where: { id: dto.taxPeriodId } });
    if (!taxPeriod || taxPeriod.clientId !== clientId) throw new NotFoundException("Tax period not found");
    if (taxPeriod.periodType !== "ZAKAT") throw new BadRequestException("Tax period is not a Zakat period");

    const equityAmount = await this.computeEquity(clientId, taxPeriod.endDate);
    const netFixedAssetsAmount = await this.computeNetFixedAssets(clientId, taxPeriod.endDate);
    const rule = await this.rules.resolve(client.jurisdiction, "ZAKAT_RATE", "STANDARD", taxPeriod.endDate);
    const zakatBase = this.computeBase(equityAmount, netFixedAssetsAmount, 0, 0);
    const zakatDue = round2(Math.max(zakatBase, 0) * (Number(rule.rate) / 100));

    const zakatReturn = await this.prisma.zakatReturn.create({
      data: {
        clientId,
        taxPeriodId: dto.taxPeriodId,
        equityAmount,
        netFixedAssetsAmount,
        additionsTotal: 0,
        deductionsTotal: 0,
        zakatBase,
        zakatRate: rule.rate,
        zakatDue,
        status: "DRAFT",
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ZAKAT_RETURN_CREATED",
      entityType: "ZakatReturn",
      entityId: zakatReturn.id,
      after: zakatReturn,
    });
    return zakatReturn;
  }

  async addAdjustment(actor: RequestUser, clientId: string, zakatReturnId: string, dto: AddZakatAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const zakatReturn = await tx.zakatReturn.findUnique({ where: { id: zakatReturnId }, include: { adjustments: true } });
      if (!zakatReturn || zakatReturn.clientId !== clientId) throw new NotFoundException("Zakat return not found");
      if (zakatReturn.status !== "DRAFT") throw new BadRequestException("Only a draft Zakat return can be adjusted");

      await tx.zakatAdjustment.create({ data: { zakatReturnId, description: dto.description, type: dto.type, amount: dto.amount } });

      const adjustments = await tx.zakatAdjustment.findMany({ where: { zakatReturnId } });
      const additionsTotal = round2(adjustments.filter((a) => a.type === "ADDITION").reduce((s, a) => s + Number(a.amount), 0));
      const deductionsTotal = round2(adjustments.filter((a) => a.type === "DEDUCTION").reduce((s, a) => s + Number(a.amount), 0));
      const zakatBase = this.computeBase(Number(zakatReturn.equityAmount), Number(zakatReturn.netFixedAssetsAmount), additionsTotal, deductionsTotal);
      const zakatDue = round2(Math.max(zakatBase, 0) * (Number(zakatReturn.zakatRate) / 100));

      const updated = await tx.zakatReturn.update({
        where: { id: zakatReturnId },
        data: { additionsTotal, deductionsTotal, zakatBase, zakatDue },
        include: { adjustments: true },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "ZAKAT_ADJUSTMENT_ADDED",
          entityType: "ZakatReturn",
          entityId: zakatReturnId,
          after: { description: dto.description, type: dto.type, amount: dto.amount },
        },
        tx,
      );

      return updated;
    });
  }

  async file(actor: RequestUser, clientId: string, zakatReturnId: string, dto: FileZakatReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const zakatReturn = await tx.zakatReturn.findUnique({ where: { id: zakatReturnId }, include: { taxPeriod: true, adjustments: true } });
      if (!zakatReturn || zakatReturn.clientId !== clientId) throw new NotFoundException("Zakat return not found");
      if (zakatReturn.status !== "DRAFT") throw new BadRequestException("Only a draft Zakat return can be filed");

      // Recompute fresh in case the ledger/asset register changed since creation.
      const equityAmount = await this.computeEquity(clientId, zakatReturn.taxPeriod.endDate);
      const netFixedAssetsAmount = await this.computeNetFixedAssets(clientId, zakatReturn.taxPeriod.endDate);
      const zakatBase = this.computeBase(equityAmount, netFixedAssetsAmount, Number(zakatReturn.additionsTotal), Number(zakatReturn.deductionsTotal));
      const zakatDue = round2(Math.max(zakatBase, 0) * (Number(zakatReturn.zakatRate) / 100));

      let journalId: string | undefined;
      if (zakatDue > 0.005) {
        const journal = await this.journals.postSystemJournal(tx, {
          clientId,
          date: zakatReturn.taxPeriod.endDate,
          description: `Zakat return ${zakatReturn.taxPeriod.name}`,
          source: "SYSTEM",
          sourceType: "ZakatReturn",
          sourceId: zakatReturn.id,
          lines: [
            { accountId: dto.expenseAccountId, debit: zakatDue, credit: 0, description: `Zakat ${zakatReturn.taxPeriod.name}` },
            { accountId: dto.payableAccountId, debit: 0, credit: zakatDue, description: `Zakat ${zakatReturn.taxPeriod.name}` },
          ],
          actorId: actor.id,
        });
        journalId = journal.id;
      }

      const filed = await tx.zakatReturn.update({
        where: { id: zakatReturnId },
        data: {
          equityAmount,
          netFixedAssetsAmount,
          zakatBase,
          zakatDue,
          status: "FILED",
          expenseAccountId: dto.expenseAccountId,
          payableAccountId: dto.payableAccountId,
          journalId,
          filedById: actor.id,
          filedAt: new Date(),
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "ZAKAT_RETURN_FILED",
          entityType: "ZakatReturn",
          entityId: zakatReturnId,
          after: { zakatDue, journalId },
        },
        tx,
      );

      return filed;
    });
  }
}
