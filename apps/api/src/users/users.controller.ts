import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { UsersService } from "./users.service";
import { InviteUserDto } from "./dto/invite-user.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("users")
  @RequirePermissions(PERMISSIONS.MANAGE_USERS)
  list(@CurrentUser() user: RequestUser) {
    return this.usersService.list(user.firmId);
  }

  @Post("users/invite")
  @RequirePermissions(PERMISSIONS.MANAGE_USERS)
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteUserDto) {
    return this.usersService.invite(user, dto);
  }

  @Get("roles")
  @RequirePermissions(PERMISSIONS.MANAGE_USERS)
  listRoles(@CurrentUser() user: RequestUser) {
    return this.usersService.listRoles(user.firmId);
  }
}
