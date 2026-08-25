import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { IndependenceService } from "./independence.service";
import { CreateIndependenceCheckDto, ResolveIndependenceCheckDto } from "./dto/independence.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/engagements/:engagementId/independence-checks")
export class IndependenceController {
  constructor(private readonly independenceService: IndependenceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.independenceService.list(clientId, engagementId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_INDEPENDENCE)
  create(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: CreateIndependenceCheckDto,
  ) {
    return this.independenceService.create(user, clientId, engagementId, dto);
  }

  @Post(":checkId/resolve")
  @RequirePermissions(PERMISSIONS.MANAGE_INDEPENDENCE)
  resolve(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Param("checkId") checkId: string,
    @Body() dto: ResolveIndependenceCheckDto,
  ) {
    return this.independenceService.resolve(user, clientId, engagementId, checkId, dto);
  }
}
