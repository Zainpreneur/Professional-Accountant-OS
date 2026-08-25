import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { VatReturnsService } from "./vat-returns.service";
import { FileVatReturnDto, GenerateVatReturnDto } from "./dto/vat-return.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/vat-returns")
export class VatReturnsController {
  constructor(private readonly vatReturnsService: VatReturnsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.vatReturnsService.list(clientId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_TAX)
  generate(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: GenerateVatReturnDto) {
    return this.vatReturnsService.generate(user, clientId, dto);
  }

  @Post(":vatReturnId/file")
  @RequirePermissions(PERMISSIONS.FILE_TAX_RETURNS)
  file(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("vatReturnId") vatReturnId: string,
    @Body() dto: FileVatReturnDto,
  ) {
    return this.vatReturnsService.file(user, clientId, vatReturnId, dto);
  }
}
