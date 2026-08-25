import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { RegulatoryRulesService } from "./regulatory-rules.service";
import { CreateRegulatoryRuleDto } from "./dto/regulatory-rule.dto";
import type { RequestUser } from "../common/types";

// Not client-scoped (no ClientTenantGuard) - regulatory rules are facts
// about a jurisdiction, shared across every firm and client in the system.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("regulatory-rules")
export class RegulatoryRulesController {
  constructor(private readonly rulesService: RegulatoryRulesService) {}

  @Get()
  list(@Query("jurisdiction") jurisdiction?: string, @Query("ruleType") ruleType?: string) {
    return this.rulesService.list(jurisdiction, ruleType);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_REGULATORY_RULES)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRegulatoryRuleDto) {
    return this.rulesService.create(user, dto);
  }
}
