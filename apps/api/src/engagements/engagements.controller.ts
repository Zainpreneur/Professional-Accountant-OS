import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { EngagementsService } from "./engagements.service";
import { AddTeamMemberDto, ConcludeEngagementDto, CreateEngagementDto, UpdateCompletionItemDto } from "./dto/engagement.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/engagements")
export class EngagementsController {
  constructor(private readonly engagementsService: EngagementsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.engagementsService.list(clientId);
  }

  @Get(":engagementId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.engagementsService.get(clientId, engagementId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_ENGAGEMENTS)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateEngagementDto) {
    return this.engagementsService.create(user, clientId, dto);
  }

  @Post(":engagementId/accept")
  @RequirePermissions(PERMISSIONS.MANAGE_ENGAGEMENTS)
  accept(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.engagementsService.setAcceptance(user, clientId, engagementId, true);
  }

  @Post(":engagementId/decline")
  @RequirePermissions(PERMISSIONS.MANAGE_ENGAGEMENTS)
  decline(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.engagementsService.setAcceptance(user, clientId, engagementId, false);
  }

  @Post(":engagementId/team")
  @RequirePermissions(PERMISSIONS.MANAGE_ENGAGEMENTS)
  addTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.engagementsService.addTeamMember(user, clientId, engagementId, dto);
  }

  @Post(":engagementId/completion/start")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  startCompletion(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.engagementsService.startCompletion(user, clientId, engagementId);
  }

  @Patch(":engagementId/completion/:itemId")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  updateCompletionItem(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateCompletionItemDto,
  ) {
    return this.engagementsService.updateCompletionItem(user, clientId, engagementId, itemId, dto);
  }

  @Post(":engagementId/conclude")
  @RequirePermissions(PERMISSIONS.MANAGE_AUDIT)
  conclude(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("engagementId") engagementId: string,
    @Body() dto: ConcludeEngagementDto,
  ) {
    return this.engagementsService.conclude(user, clientId, engagementId, dto);
  }

  @Post(":engagementId/approve")
  @RequirePermissions(PERMISSIONS.APPROVE_AUDIT)
  approve(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("engagementId") engagementId: string) {
    return this.engagementsService.approve(user, clientId, engagementId);
  }
}
