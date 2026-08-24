import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { ReportsService } from "./reports.service";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("trial-balance")
  @RequirePermissions(PERMISSIONS.VIEW_REPORTS)
  trialBalance(@Param("clientId") clientId: string, @Query("asOf") asOf?: string) {
    return this.reportsService.trialBalance(clientId, asOf);
  }

  @Get("accounts/:accountId/ledger")
  @RequirePermissions(PERMISSIONS.VIEW_REPORTS)
  accountLedger(
    @Param("clientId") clientId: string,
    @Param("accountId") accountId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.accountLedger(clientId, accountId, from, to);
  }

  @Get("ar-aging")
  @RequirePermissions(PERMISSIONS.VIEW_REPORTS)
  arAging(@Param("clientId") clientId: string, @Query("asOf") asOf?: string) {
    return this.reportsService.arAging(clientId, asOf);
  }

  @Get("ap-aging")
  @RequirePermissions(PERMISSIONS.VIEW_REPORTS)
  apAging(@Param("clientId") clientId: string, @Query("asOf") asOf?: string) {
    return this.reportsService.apAging(clientId, asOf);
  }
}
