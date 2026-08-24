import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { InventoryService } from "./inventory.service";
import { StockMovementsService } from "./stock-movements.service";
import {
  CreateProductDto,
  CreateWarehouseDto,
  StockAdjustmentDto,
  StockIssueDto,
  StockReceiptDto,
} from "./dto/inventory.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get("products")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listProducts(@Param("clientId") clientId: string) {
    return this.inventoryService.listProducts(clientId);
  }

  @Post("products")
  @RequirePermissions(PERMISSIONS.MANAGE_INVENTORY)
  createProduct(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(user, clientId, dto);
  }

  @Get("warehouses")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listWarehouses(@Param("clientId") clientId: string) {
    return this.inventoryService.listWarehouses(clientId);
  }

  @Post("warehouses")
  @RequirePermissions(PERMISSIONS.MANAGE_INVENTORY)
  createWarehouse(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(user, clientId, dto);
  }

  @Get("inventory/valuation")
  @RequirePermissions(PERMISSIONS.VIEW_REPORTS)
  valuation(@Param("clientId") clientId: string) {
    return this.inventoryService.valuation(clientId);
  }

  @Get("stock-movements")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listMovements(@Param("clientId") clientId: string) {
    return this.stockMovementsService.list(clientId);
  }

  @Post("stock-movements/receipt")
  @RequirePermissions(PERMISSIONS.MANAGE_INVENTORY)
  receipt(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: StockReceiptDto) {
    return this.stockMovementsService.receipt(user, clientId, dto);
  }

  @Post("stock-movements/issue")
  @RequirePermissions(PERMISSIONS.MANAGE_INVENTORY)
  issue(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: StockIssueDto) {
    return this.stockMovementsService.issue(user, clientId, dto);
  }

  @Post("stock-movements/adjustment")
  @RequirePermissions(PERMISSIONS.MANAGE_INVENTORY)
  adjust(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: StockAdjustmentDto) {
    return this.stockMovementsService.adjust(user, clientId, dto);
  }
}
