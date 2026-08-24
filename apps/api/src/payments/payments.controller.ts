import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/payment.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.paymentsService.list(clientId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_PAYMENTS)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user, clientId, dto);
  }
}
