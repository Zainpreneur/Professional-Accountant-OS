import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateProductDto, CreateWarehouseDto } from "./dto/inventory.dto";
import type { RequestUser } from "../common/types";

// Products/warehouses master data plus the valuation report. The actual
// stock-moving operations (receipt/issue/adjustment) live in
// StockMovementsService, since each of those has to post a journal.
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listProducts(clientId: string) {
    return this.prisma.product.findMany({ where: { clientId }, orderBy: { sku: "asc" } });
  }

  async createProduct(actor: RequestUser, clientId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { clientId_sku: { clientId, sku: dto.sku } } });
    if (existing) throw new BadRequestException(`SKU ${dto.sku} already exists`);

    const product = await this.prisma.product.create({ data: { ...dto, clientId } });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      after: product,
    });
    return product;
  }

  listWarehouses(clientId: string) {
    return this.prisma.warehouse.findMany({ where: { clientId }, orderBy: { code: "asc" } });
  }

  async createWarehouse(actor: RequestUser, clientId: string, dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({ where: { clientId_code: { clientId, code: dto.code } } });
    if (existing) throw new BadRequestException(`Warehouse code ${dto.code} already exists`);

    const warehouse = await this.prisma.warehouse.create({ data: { ...dto, clientId } });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "WAREHOUSE_CREATED",
      entityType: "Warehouse",
      entityId: warehouse.id,
      after: warehouse,
    });
    return warehouse;
  }

  async valuation(clientId: string) {
    const stock = await this.prisma.productStock.findMany({
      where: { product: { clientId } },
      include: { product: true, warehouse: true },
    });

    const rows = stock
      .filter((s) => Number(s.quantityOnHand) !== 0)
      .map((s) => ({
        productId: s.productId,
        sku: s.product.sku,
        productName: s.product.name,
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        quantityOnHand: Number(s.quantityOnHand),
        averageCost: Number(s.averageCost),
        value: Math.round(Number(s.quantityOnHand) * Number(s.averageCost) * 100) / 100,
      }));

    const totalValue = Math.round(rows.reduce((sum, r) => sum + r.value, 0) * 100) / 100;
    return { rows, totalValue };
  }
}
