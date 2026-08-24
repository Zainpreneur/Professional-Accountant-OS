import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { DocumentIntelligenceService } from "./document-intelligence.service";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/documents/:documentId/extraction")
export class DocumentIntelligenceController {
  constructor(private readonly intelligenceService: DocumentIntelligenceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_DOCUMENTS)
  get(@Param("clientId") clientId: string, @Param("documentId") documentId: string) {
    return this.intelligenceService.get(clientId, documentId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_DOCUMENTS)
  extract(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("documentId") documentId: string) {
    return this.intelligenceService.extract(user, clientId, documentId);
  }
}
