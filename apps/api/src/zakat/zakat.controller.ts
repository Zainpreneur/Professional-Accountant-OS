import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { ZakatService } from "./zakat.service";
import { AddZakatAdjustmentDto, CreateZakatReturnDto, FileZakatReturnDto } from "./dto/zakat.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/zakat-returns")
export class ZakatController {
  constructor(private readonly zakatService: ZakatService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.zakatService.list(clientId);
  }

  @Get(":zakatReturnId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("zakatReturnId") zakatReturnId: string) {
    return this.zakatService.get(clientId, zakatReturnId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_TAX)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateZakatReturnDto) {
    return this.zakatService.create(user, clientId, dto);
  }

  @Post(":zakatReturnId/adjustments")
  @RequirePermissions(PERMISSIONS.MANAGE_TAX)
  addAdjustment(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("zakatReturnId") zakatReturnId: string,
    @Body() dto: AddZakatAdjustmentDto,
  ) {
    return this.zakatService.addAdjustment(user, clientId, zakatReturnId, dto);
  }

  @Post(":zakatReturnId/file")
  @RequirePermissions(PERMISSIONS.FILE_TAX_RETURNS)
  file(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("zakatReturnId") zakatReturnId: string,
    @Body() dto: FileZakatReturnDto,
  ) {
    return this.zakatService.file(user, clientId, zakatReturnId, dto);
  }
}
