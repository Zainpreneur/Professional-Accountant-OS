import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { AuditWorkService } from "./audit-work.service";
import {
  CreateEvidenceDto,
  CreateFindingDto,
  CreateProcedureDto,
  CreateRiskDto,
  UpdateFindingDto,
  UpdateProcedureDto,
} from "./dto/audit-work.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/engagements/:engagementId")
export class AuditWorkController {
  constructor(private readonly auditWorkService: AuditWorkService) {}

  @Get("risks")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listRisks(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.auditWorkService.listRisks(clientId, engagementId);
  }

  @Post("risks")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  createRisk(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: CreateRiskDto,
  ) {
    return this.auditWorkService.createRisk(user, clientId, engagementId, dto);
  }

  @Get("procedures")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listProcedures(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.auditWorkService.listProcedures(clientId, engagementId);
  }

  @Post("procedures")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  createProcedure(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: CreateProcedureDto,
  ) {
    return this.auditWorkService.createProcedure(user, clientId, engagementId, dto);
  }

  @Patch("procedures/:procedureId")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  updateProcedure(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Param("procedureId") procedureId: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.auditWorkService.updateProcedure(user, clientId, engagementId, procedureId, dto);
  }

  @Get("evidence")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listEvidence(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.auditWorkService.listEvidence(clientId, engagementId);
  }

  @Post("evidence")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  createEvidence(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.auditWorkService.createEvidence(user, clientId, engagementId, dto);
  }

  @Get("findings")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listFindings(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.auditWorkService.listFindings(clientId, engagementId);
  }

  @Post("findings")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  createFinding(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: CreateFindingDto,
  ) {
    return this.auditWorkService.createFinding(user, clientId, engagementId, dto);
  }

  @Patch("findings/:findingId")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  updateFinding(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Param("findingId") findingId: string,
    @Body() dto: UpdateFindingDto,
  ) {
    return this.auditWorkService.updateFinding(user, clientId, engagementId, findingId, dto);
  }
}
