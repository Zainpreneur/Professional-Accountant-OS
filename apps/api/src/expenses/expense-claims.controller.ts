import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { ExpenseClaimsService } from "./expense-claims.service";
import { CreateExpenseClaimDto, PostExpenseClaimDto } from "./dto/expense-claim.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/expense-claims")
export class ExpenseClaimsController {
  constructor(private readonly expenseClaimsService: ExpenseClaimsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Query("status") status?: string) {
    return this.expenseClaimsService.list(clientId, status);
  }

  @Get(":claimId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("claimId") claimId: string) {
    return this.expenseClaimsService.get(clientId, claimId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_EXPENSES)
  create(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateExpenseClaimDto) {
    return this.expenseClaimsService.create(user, clientId, dto);
  }

  @Post(":claimId/submit")
  @RequirePermissions(PERMISSIONS.MANAGE_EXPENSES)
  submit(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("claimId") claimId: string) {
    return this.expenseClaimsService.submit(user, clientId, claimId);
  }

  @Post(":claimId/approve")
  @RequirePermissions(PERMISSIONS.APPROVE_EXPENSES)
  approve(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("claimId") claimId: string) {
    return this.expenseClaimsService.approve(user, clientId, claimId);
  }

  @Post(":claimId/reject")
  @RequirePermissions(PERMISSIONS.APPROVE_EXPENSES)
  reject(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("claimId") claimId: string) {
    return this.expenseClaimsService.reject(user, clientId, claimId);
  }

  @Post(":claimId/post")
  @RequirePermissions(PERMISSIONS.MANAGE_EXPENSES, PERMISSIONS.POST_TRANSACTION)
  post(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("claimId") claimId: string,
    @Body() dto: PostExpenseClaimDto,
  ) {
    return this.expenseClaimsService.post(user, clientId, claimId, dto);
  }
}
