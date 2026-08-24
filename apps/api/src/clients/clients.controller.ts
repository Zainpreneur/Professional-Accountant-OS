import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientsService } from "./clients.service";
import { CreateClientDto, UpdateClientDto } from "./dto/create-client.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@CurrentUser() user: RequestUser) {
    return this.clientsService.list(user.firmId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CREATE_CLIENT)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @UseGuards(ClientTenantGuard)
  @Get(":clientId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string) {
    return this.clientsService.get(user.firmId, clientId);
  }

  @UseGuards(ClientTenantGuard)
  @Patch(":clientId")
  @RequirePermissions(PERMISSIONS.EDIT_CLIENT)
  update(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(user, clientId, dto);
  }
}
