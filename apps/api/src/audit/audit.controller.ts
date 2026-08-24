import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_AUDIT_TRAIL)
  async list(
    @CurrentUser() user: RequestUser,
    @Query("clientId") clientId?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        firmId: user.firmId,
        ...(clientId ? { clientId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
