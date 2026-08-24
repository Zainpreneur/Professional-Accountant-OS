import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreateFixedAssetDto, DisposeFixedAssetDto, RunDepreciationDto } from "./dto/fixed-asset.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Fixed Assets (SRS 21). Acquisition posts immediately (Debit asset account,
// Credit the funding account); depreciation and disposal are the only two
// ways the ledger impact of an asset can change afterwards - both create
// their own posted journal, never edit the acquisition entry.
@Injectable()
export class FixedAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.fixedAsset.findMany({ where: { clientId }, orderBy: { acquisitionDate: "desc" } });
  }

  async get(clientId: string, assetId: string) {
    const asset = await this.prisma.fixedAsset.findUnique({
      where: { id: assetId },
      include: { depreciationEntries: { include: { run: true } } },
    });
    if (!asset || asset.clientId !== clientId) throw new NotFoundException("Asset not found");
    return asset;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateFixedAssetDto) {
    const existing = await this.prisma.fixedAsset.findUnique({
      where: { clientId_assetCode: { clientId, assetCode: dto.assetCode } },
    });
    if (existing) throw new BadRequestException(`Asset code ${dto.assetCode} already exists`);
    if ((dto.salvageValue ?? 0) >= dto.acquisitionCost) {
      throw new BadRequestException("Salvage value must be less than acquisition cost");
    }

    return this.prisma.$transaction(async (tx) => {
      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.acquisitionDate),
        description: `Acquisition of asset ${dto.assetCode} - ${dto.name}`,
        source: "SYSTEM",
        sourceType: "FixedAsset",
        sourceId: dto.assetCode,
        lines: [
          { accountId: dto.assetAccountId, debit: dto.acquisitionCost, credit: 0 },
          { accountId: dto.fundingAccountId, debit: 0, credit: dto.acquisitionCost },
        ],
        actorId: actor.id,
      });

      const asset = await tx.fixedAsset.create({
        data: {
          clientId,
          assetCode: dto.assetCode,
          name: dto.name,
          category: dto.category,
          acquisitionDate: new Date(dto.acquisitionDate),
          acquisitionCost: dto.acquisitionCost,
          salvageValue: dto.salvageValue ?? 0,
          usefulLifeMonths: dto.usefulLifeMonths,
          assetAccountId: dto.assetAccountId,
          depreciationExpenseAccountId: dto.depreciationExpenseAccountId,
          accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId,
          acquisitionJournalId: journal.id,
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "FIXED_ASSET_ACQUIRED",
          entityType: "FixedAsset",
          entityId: asset.id,
          after: asset,
        },
        tx,
      );

      return asset;
    });
  }

  // Straight-line depreciation for every ACTIVE asset, one journal per run
  // (SRS 21, 70). The @@unique([clientId, periodLabel]) constraint makes a
  // period double-run impossible - the DB rejects the duplicate DepreciationRun.
  async runDepreciation(actor: RequestUser, clientId: string, dto: RunDepreciationDto) {
    return this.prisma.$transaction(async (tx) => {
      const assets = await tx.fixedAsset.findMany({ where: { clientId, status: "ACTIVE" } });

      const entries: { assetId: string; amount: number }[] = [];
      const expenseByAccount = new Map<string, number>();
      const accumByAccount = new Map<string, number>();

      for (const asset of assets) {
        const depreciable = round2(Number(asset.acquisitionCost) - Number(asset.salvageValue));
        const monthly = round2(depreciable / asset.usefulLifeMonths);
        const remaining = round2(depreciable - Number(asset.accumulatedDepreciation));
        const amount = Math.min(monthly, Math.max(remaining, 0));
        if (amount <= 0) continue;

        entries.push({ assetId: asset.id, amount });
        expenseByAccount.set(
          asset.depreciationExpenseAccountId,
          round2((expenseByAccount.get(asset.depreciationExpenseAccountId) ?? 0) + amount),
        );
        accumByAccount.set(
          asset.accumulatedDepreciationAccountId,
          round2((accumByAccount.get(asset.accumulatedDepreciationAccountId) ?? 0) + amount),
        );
      }

      if (entries.length === 0) {
        throw new BadRequestException("No active assets have remaining depreciable value for this period");
      }

      const totalAmount = round2(entries.reduce((s, e) => s + e.amount, 0));
      const lines = [
        ...[...expenseByAccount.entries()].map(([accountId, amount]) => ({
          accountId,
          debit: amount,
          credit: 0,
          description: `Depreciation ${dto.periodLabel}`,
        })),
        ...[...accumByAccount.entries()].map(([accountId, amount]) => ({
          accountId,
          debit: 0,
          credit: amount,
          description: `Depreciation ${dto.periodLabel}`,
        })),
      ];

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.runDate),
        description: `Depreciation run ${dto.periodLabel}`,
        source: "SYSTEM",
        sourceType: "DepreciationRun",
        sourceId: dto.periodLabel,
        lines,
        actorId: actor.id,
      });

      const run = await tx.depreciationRun.create({
        data: {
          clientId,
          periodLabel: dto.periodLabel,
          runDate: new Date(dto.runDate),
          status: "POSTED",
          totalAmount,
          journalId: journal.id,
          entries: { create: entries },
        },
        include: { entries: true },
      });

      for (const entry of entries) {
        await tx.fixedAsset.update({
          where: { id: entry.assetId },
          data: { accumulatedDepreciation: { increment: entry.amount } },
        });
      }

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "DEPRECIATION_RUN_POSTED",
          entityType: "DepreciationRun",
          entityId: run.id,
          after: { periodLabel: run.periodLabel, totalAmount: run.totalAmount, assetCount: entries.length },
        },
        tx,
      );

      return run;
    });
  }

  async dispose(actor: RequestUser, clientId: string, assetId: string, dto: DisposeFixedAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findUnique({ where: { id: assetId } });
      if (!asset || asset.clientId !== clientId) throw new NotFoundException("Asset not found");
      if (asset.status !== "ACTIVE") throw new BadRequestException("Only an active asset can be disposed");

      const netBookValue = round2(Number(asset.acquisitionCost) - Number(asset.accumulatedDepreciation));
      const gainLoss = round2(dto.disposalProceeds - netBookValue);

      if (Math.abs(gainLoss) > 0.005 && !dto.gainLossAccountId) {
        throw new BadRequestException("gainLossAccountId is required when disposal proceeds differ from net book value");
      }

      const lines = [
        { accountId: dto.cashAccountId, debit: dto.disposalProceeds, credit: 0, description: `Disposal of ${asset.assetCode}` },
        {
          accountId: asset.accumulatedDepreciationAccountId,
          debit: Number(asset.accumulatedDepreciation),
          credit: 0,
          description: `Disposal of ${asset.assetCode}`,
        },
        {
          accountId: asset.assetAccountId,
          debit: 0,
          credit: Number(asset.acquisitionCost),
          description: `Disposal of ${asset.assetCode}`,
        },
      ];
      if (gainLoss > 0.005) {
        lines.push({ accountId: dto.gainLossAccountId!, debit: 0, credit: gainLoss, description: "Gain on disposal" });
      } else if (gainLoss < -0.005) {
        lines.push({ accountId: dto.gainLossAccountId!, debit: -gainLoss, credit: 0, description: "Loss on disposal" });
      }

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.disposalDate),
        description: `Disposal of asset ${asset.assetCode} - ${asset.name}`,
        source: "SYSTEM",
        sourceType: "FixedAssetDisposal",
        sourceId: asset.id,
        lines,
        actorId: actor.id,
      });

      const disposed = await tx.fixedAsset.update({
        where: { id: assetId },
        data: {
          status: "DISPOSED",
          disposalDate: new Date(dto.disposalDate),
          disposalProceeds: dto.disposalProceeds,
          disposalJournalId: journal.id,
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "FIXED_ASSET_DISPOSED",
          entityType: "FixedAsset",
          entityId: assetId,
          after: { disposalProceeds: dto.disposalProceeds, gainLoss },
        },
        tx,
      );

      return disposed;
    });
  }
}
