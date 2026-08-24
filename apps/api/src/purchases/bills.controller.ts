import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { BillsService } from "./bills.service";
import { CreateBillDto } from "./dto/bill.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/bills")
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Query("status") status?: string) {
    return this.billsService.list(clientId, status);
  }

  @Get(":billId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("billId") billId: string) {
    return this.billsService.get(clientId, billId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_PURCHASES)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateBillDto) {
    return this.billsService.create(user, clientId, dto);
  }

  @Post(":billId/post")
  @RequirePermissions(PERMISSIONS.MANAGE_PURCHASES, PERMISSIONS.POST_TRANSACTION)
  post(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("billId") billId: string) {
    return this.billsService.post(user, clientId, billId);
  }
}
