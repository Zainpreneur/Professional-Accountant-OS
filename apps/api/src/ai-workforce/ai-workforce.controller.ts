import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { AiWorkforceService } from "./ai-workforce.service";
import { ReviewFindingDto } from "./dto/ai-workforce.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/ai-agents")
export class AiWorkforceController {
  constructor(private readonly aiWorkforce: AiWorkforceService) {}

  @Post(":agentType/run")
  @RequirePermissions(PERMISSIONS.MANAGE_AI_AGENTS)
  runAgent(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("agentType") agentType: string) {
    return this.aiWorkforce.runAgent(user, clientId, agentType);
  }

  @Post("run-all")
  @RequirePermissions(PERMISSIONS.MANAGE_AI_AGENTS)
  runAll(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string) {
    return this.aiWorkforce.runAll(user, clientId);
  }

  @Get("queue")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  queue(@Param("clientId") clientId: string, @Query("status") status?: string) {
    return this.aiWorkforce.queue(clientId, status);
  }

  @Get("runs")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listRuns(@Param("clientId") clientId: string, @Query("agentType") agentType?: string) {
    return this.aiWorkforce.listRuns(clientId, agentType);
  }

  @Post("runs/:runId/review")
  @RequirePermissions(PERMISSIONS.REVIEW_AI_FINDINGS)
  review(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("runId") runId: string,
    @Body() dto: ReviewFindingDto,
  ) {
    return this.aiWorkforce.review(user, clientId, runId, dto);
  }
}
