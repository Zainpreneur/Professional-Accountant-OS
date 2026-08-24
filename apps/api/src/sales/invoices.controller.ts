import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/invoice.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Query("status") status?: string) {
    return this.invoicesService.list(clientId, status);
  }

  @Get(":invoiceId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("invoiceId") invoiceId: string) {
    return this.invoicesService.get(clientId, invoiceId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_SALES)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user, clientId, dto);
  }

  @Post(":invoiceId/post")
  @RequirePermissions(PERMISSIONS.MANAGE_SALES, PERMISSIONS.POST_TRANSACTION)
  post(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("invoiceId") invoiceId: string) {
    return this.invoicesService.post(user, clientId, invoiceId);
  }
}
