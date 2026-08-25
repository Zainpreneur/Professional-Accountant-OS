import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { JudgmentService } from "./judgment.service";
import { CreateJudgmentCaseDto, DecideJudgmentCaseDto } from "./dto/judgment.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/judgment-cases")
export class JudgmentController {
  constructor(private readonly judgmentService: JudgmentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.judgmentService.list(clientId);
  }

  @Get(":caseId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("caseId") caseId: string) {
    return this.judgmentService.get(clientId, caseId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_PROFESSIONAL_JUDGMENT)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateJudgmentCaseDto) {
    return this.judgmentService.create(user, clientId, dto);
  }

  @Post(":caseId/decide")
  @RequirePermissions(PERMISSIONS.MANAGE_PROFESSIONAL_JUDGMENT)
  decide(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("caseId") caseId: string,
    @Body() dto: DecideJudgmentCaseDto,
  ) {
    return this.judgmentService.decide(user, clientId, caseId, dto);
  }

  @Post(":caseId/approve")
  @RequirePermissions(PERMISSIONS.APPROVE_PROFESSIONAL_JUDGMENT)
  approve(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("caseId") caseId: string) {
    return this.judgmentService.approve(user, clientId, caseId);
  }
}
