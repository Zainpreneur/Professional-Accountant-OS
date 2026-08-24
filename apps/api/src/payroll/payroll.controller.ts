import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { PayrollService } from "./payroll.service";
import { CreatePayrollRunDto, PostPayrollRunDto } from "./dto/payroll.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/payroll-runs")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.payrollService.list(clientId);
  }

  @Get(":runId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("runId") runId: string) {
    return this.payrollService.get(clientId, runId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_PAYROLL)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreatePayrollRunDto) {
    return this.payrollService.create(user, clientId, dto);
  }

  @Post(":runId/post")
  @RequirePermissions(PERMISSIONS.MANAGE_PAYROLL, PERMISSIONS.POST_TRANSACTION)
  post(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("runId") runId: string,
    @Body() dto: PostPayrollRunDto,
  ) {
    return this.payrollService.post(user, clientId, runId, dto);
  }
}
