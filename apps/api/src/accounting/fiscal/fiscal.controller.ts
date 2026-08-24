import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsIn } from "class-validator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../rbac/permissions.guard";
import { ClientTenantGuard } from "../../rbac/tenant.guard";
import { RequirePermissions } from "../../rbac/permissions.decorator";
import { PERMISSIONS } from "../../rbac/permissions";
import { CurrentUser } from "../../common/current-user.decorator";
import { FiscalService } from "./fiscal.service";
import type { RequestUser } from "../../common/types";

class SetPeriodStatusDto {
  @IsIn(["OPEN", "LOCKED", "CLOSED"])
  status!: "OPEN" | "LOCKED" | "CLOSED";
}

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId")
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get("fiscal-years")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listFiscalYears(@Param("clientId") clientId: string) {
    return this.fiscalService.listFiscalYears(clientId);
  }

  @Get("periods")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listPeriods(@Param("clientId") clientId: string) {
    return this.fiscalService.listPeriods(clientId);
  }

  @Patch("periods/:periodId")
  @RequirePermissions(PERMISSIONS.MANAGE_PERIODS)
  setStatus(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("periodId") periodId: string,
    @Body() dto: SetPeriodStatusDto,
  ) {
    return this.fiscalService.setPeriodStatus(user, clientId, periodId, dto.status);
  }
}
