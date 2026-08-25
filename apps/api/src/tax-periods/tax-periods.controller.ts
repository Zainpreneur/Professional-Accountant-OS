import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { TaxPeriodsService } from "./tax-periods.service";
import { CreateTaxPeriodDto } from "./dto/tax-period.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/tax-periods")
export class TaxPeriodsController {
  constructor(private readonly taxPeriodsService: TaxPeriodsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Query("periodType") periodType?: string) {
    return this.taxPeriodsService.list(clientId, periodType);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_TAX)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateTaxPeriodDto) {
    return this.taxPeriodsService.create(user, clientId, dto);
  }
}
