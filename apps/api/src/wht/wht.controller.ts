import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { WhtService } from "./wht.service";
import { CalculateWhtDto, GenerateWhtReturnDto } from "./dto/wht.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId")
export class WhtController {
  constructor(private readonly whtService: WhtService) {}

  @Post("wht/calculate")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  calculate(@Param("clientId") clientId: string, @Body() dto: CalculateWhtDto) {
    return this.whtService.calculate(clientId, dto);
  }

  @Get("wht-returns")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.whtService.list(clientId);
  }

  @Post("wht-returns")
  @RequirePermissions(PERMISSIONS.MANAGE_TAX)
  generate(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: GenerateWhtReturnDto) {
    return this.whtService.generate(user, clientId, dto);
  }

  @Post("wht-returns/:whtReturnId/file")
  @RequirePermissions(PERMISSIONS.FILE_TAX_RETURNS)
  file(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("whtReturnId") whtReturnId: string) {
    return this.whtService.file(user, clientId, whtReturnId);
  }
}
