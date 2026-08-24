import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../rbac/permissions.guard";
import { ClientTenantGuard } from "../../rbac/tenant.guard";
import { RequirePermissions } from "../../rbac/permissions.decorator";
import { PERMISSIONS } from "../../rbac/permissions";
import { CurrentUser } from "../../common/current-user.decorator";
import { ChartOfAccountsService } from "./coa.service";
import { CreateAccountDto, UpdateAccountDto } from "./dto/create-account.dto";
import type { RequestUser } from "../../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/accounts")
export class ChartOfAccountsController {
  constructor(private readonly coaService: ChartOfAccountsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.coaService.list(clientId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_MASTER_DATA)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateAccountDto) {
    return this.coaService.create(user, clientId, dto);
  }

  @Patch(":accountId")
  @RequirePermissions(PERMISSIONS.MANAGE_MASTER_DATA)
  update(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("accountId") accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.coaService.update(user, clientId, accountId, dto);
  }
}
