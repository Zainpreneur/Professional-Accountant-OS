import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { ComplianceCalendarService } from "./compliance-calendar.service";
import { CreateComplianceDeadlineDto } from "./dto/compliance.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/compliance-deadlines")
export class ComplianceCalendarController {
  constructor(private readonly complianceService: ComplianceCalendarService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.complianceService.list(clientId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_COMPLIANCE)
  createCustom(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateComplianceDeadlineDto) {
    return this.complianceService.createCustom(user, clientId, dto);
  }

  @Post(":deadlineId/complete")
  @RequirePermissions(PERMISSIONS.MANAGE_COMPLIANCE)
  complete(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("deadlineId") deadlineId: string) {
    return this.complianceService.complete(user, clientId, deadlineId);
  }
}
