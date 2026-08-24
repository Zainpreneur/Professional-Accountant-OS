import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string) {
    return this.customersService.list(clientId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_MASTER_DATA)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user, clientId, dto);
  }

  @Patch(":customerId")
  @RequirePermissions(PERMISSIONS.MANAGE_MASTER_DATA)
  update(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user, clientId, customerId, dto);
  }
}
