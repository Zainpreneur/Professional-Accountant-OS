import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { FixedAssetsService } from "./fixed-assets.service";
import { CreateFixedAssetDto, DisposeFixedAssetDto, RunDepreciationDto } from "./dto/fixed-asset.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId")
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Get("fixed-assets")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.fixedAssetsService.list(clientId);
  }

  @Get("fixed-assets/:assetId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("assetId") assetId: string) {
    return this.fixedAssetsService.get(clientId, assetId);
  }

  @Post("fixed-assets")
  @RequirePermissions(PERMISSIONS.MANAGE_FIXED_ASSETS)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateFixedAssetDto) {
    return this.fixedAssetsService.create(user, clientId, dto);
  }

  @Post("fixed-assets/:assetId/dispose")
  @RequirePermissions(PERMISSIONS.MANAGE_FIXED_ASSETS)
  dispose(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @Body() dto: DisposeFixedAssetDto,
  ) {
    return this.fixedAssetsService.dispose(user, clientId, assetId, dto);
  }

  @Post("depreciation-runs")
  @RequirePermissions(PERMISSIONS.MANAGE_FIXED_ASSETS)
  runDepreciation(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: RunDepreciationDto) {
    return this.fixedAssetsService.runDepreciation(user, clientId, dto);
  }
}
