import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@accountant-os/db";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { StockAdjustmentDto, StockIssueDto, StockReceiptDto } from "./dto/inventory.dto";
import type { RequestUser } from "../common/types";

type Tx = Prisma.TransactionClient;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

// Weighted-average costing (SRS 20): every movement recomputes
// ProductStock.averageCost and posts its own balancing journal in the same
// transaction, so the GL's Inventory control account and the stock
// subledger can never drift apart.
@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.stockMovement.findMany({
      where: { clientId },
      include: { product: true, warehouse: true },
      orderBy: { date: "desc" },
    });
  }

  private async getStockRow(tx: Tx, productId: string, warehouseId: string) {
    return (
      (await tx.productStock.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } })) ?? {
        quantityOnHand: 0,
        averageCost: 0,
      }
    );
  }

  async receipt(actor: RequestUser, clientId: string, dto: StockReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product || product.clientId !== clientId) throw new BadRequestException("Product not found");
      const warehouse = await tx.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse || warehouse.clientId !== clientId) throw new BadRequestException("Warehouse not found");

      const totalCost = round2(dto.quantity * dto.unitCost);

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.date),
        description: `Stock receipt: ${product.sku}${dto.reference ? ` (${dto.reference})` : ""}`,
        source: "SYSTEM",
        sourceType: "StockMovement",
        sourceId: dto.productId,
        lines: [
          { accountId: product.inventoryAccountId, debit: totalCost, credit: 0 },
          { accountId: dto.fundingAccountId, debit: 0, credit: totalCost },
        ],
        actorId: actor.id,
      });

      const current = await this.getStockRow(tx, dto.productId, dto.warehouseId);
      const newQty = round4(Number(current.quantityOnHand) + dto.quantity);
      const newAvg =
        newQty === 0
          ? 0
          : round4((Number(current.quantityOnHand) * Number(current.averageCost) + dto.quantity * dto.unitCost) / newQty);

      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
        update: { quantityOnHand: newQty, averageCost: newAvg },
        create: { productId: dto.productId, warehouseId: dto.warehouseId, quantityOnHand: newQty, averageCost: newAvg },
      });

      const movement = await tx.stockMovement.create({
        data: {
          clientId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: "RECEIPT",
          date: new Date(dto.date),
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          totalCost,
          reference: dto.reference,
          journalId: journal.id,
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "STOCK_RECEIPT_POSTED",
          entityType: "StockMovement",
          entityId: movement.id,
          after: movement,
        },
        tx,
      );

      return movement;
    });
  }

  async issue(actor: RequestUser, clientId: string, dto: StockIssueDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product || product.clientId !== clientId) throw new BadRequestException("Product not found");
      const warehouse = await tx.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse || warehouse.clientId !== clientId) throw new BadRequestException("Warehouse not found");

      const current = await this.getStockRow(tx, dto.productId, dto.warehouseId);
      if (dto.quantity > Number(current.quantityOnHand) + 0.0001) {
        throw new BadRequestException(
          `Insufficient stock: ${current.quantityOnHand} on hand, cannot issue ${dto.quantity}`,
        );
      }

      const unitCost = Number(current.averageCost);
      const totalCost = round2(dto.quantity * unitCost);

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.date),
        description: `Stock issue: ${product.sku}${dto.reference ? ` (${dto.reference})` : ""}`,
        source: "SYSTEM",
        sourceType: "StockMovement",
        sourceId: dto.productId,
        lines: [
          { accountId: product.cogsAccountId, debit: totalCost, credit: 0 },
          { accountId: product.inventoryAccountId, debit: 0, credit: totalCost },
        ],
        actorId: actor.id,
      });

      const newQty = round4(Number(current.quantityOnHand) - dto.quantity);
      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
        update: { quantityOnHand: newQty },
        create: { productId: dto.productId, warehouseId: dto.warehouseId, quantityOnHand: newQty, averageCost: 0 },
      });

      const movement = await tx.stockMovement.create({
        data: {
          clientId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: "ISSUE",
          date: new Date(dto.date),
          quantity: dto.quantity,
          unitCost,
          totalCost,
          reference: dto.reference,
          journalId: journal.id,
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "STOCK_ISSUE_POSTED",
          entityType: "StockMovement",
          entityId: movement.id,
          after: movement,
        },
        tx,
      );

      return movement;
    });
  }

  async adjust(actor: RequestUser, clientId: string, dto: StockAdjustmentDto) {
    if (dto.quantityDelta === 0) throw new BadRequestException("quantityDelta must be non-zero");
    if (dto.quantityDelta > 0 && dto.unitCost === undefined) {
      throw new BadRequestException("unitCost is required when increasing stock via adjustment");
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product || product.clientId !== clientId) throw new BadRequestException("Product not found");
      const warehouse = await tx.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse || warehouse.clientId !== clientId) throw new BadRequestException("Warehouse not found");

      const current = await this.getStockRow(tx, dto.productId, dto.warehouseId);
      const increasing = dto.quantityDelta > 0;
      const unitCost = increasing ? dto.unitCost! : Number(current.averageCost);
      const absQty = Math.abs(dto.quantityDelta);
      const totalCost = round2(absQty * unitCost);

      if (!increasing && absQty > Number(current.quantityOnHand) + 0.0001) {
        throw new BadRequestException(
          `Insufficient stock: ${current.quantityOnHand} on hand, cannot remove ${absQty}`,
        );
      }

      const lines = increasing
        ? [
            { accountId: product.inventoryAccountId, debit: totalCost, credit: 0 },
            { accountId: dto.adjustmentAccountId, debit: 0, credit: totalCost },
          ]
        : [
            { accountId: dto.adjustmentAccountId, debit: totalCost, credit: 0 },
            { accountId: product.inventoryAccountId, debit: 0, credit: totalCost },
          ];

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.date),
        description: `Stock adjustment: ${product.sku}${dto.reference ? ` (${dto.reference})` : ""}`,
        source: "SYSTEM",
        sourceType: "StockMovement",
        sourceId: dto.productId,
        lines,
        actorId: actor.id,
      });

      const newQty = round4(Number(current.quantityOnHand) + dto.quantityDelta);
      const newAvg = increasing
        ? newQty === 0
          ? 0
          : round4((Number(current.quantityOnHand) * Number(current.averageCost) + absQty * unitCost) / newQty)
        : Number(current.averageCost);

      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
        update: { quantityOnHand: newQty, averageCost: newAvg },
        create: { productId: dto.productId, warehouseId: dto.warehouseId, quantityOnHand: newQty, averageCost: newAvg },
      });

      const movement = await tx.stockMovement.create({
        data: {
          clientId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: "ADJUSTMENT",
          date: new Date(dto.date),
          quantity: dto.quantityDelta,
          unitCost,
          totalCost,
          reference: dto.reference,
          journalId: journal.id,
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "STOCK_ADJUSTMENT_POSTED",
          entityType: "StockMovement",
          entityId: movement.id,
          after: movement,
        },
        tx,
      );

      return movement;
    });
  }
}
