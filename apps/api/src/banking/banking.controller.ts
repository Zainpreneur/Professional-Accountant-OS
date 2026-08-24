import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { BankingService } from "./banking.service";
import {
  AutoMatchDto,
  CreateReconciliationDto,
  CreateTransactionFromLineDto,
  MatchLineDto,
  UnmatchLineDto,
} from "./dto/banking.dto";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/banking")
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Post("statement-imports")
  @UseInterceptors(FileInterceptor("file"))
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  importStatement(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("bankAccountId") bankAccountId: string,
  ) {
    return this.bankingService.importStatement(user, clientId, bankAccountId, file);
  }

  @Get("statement-imports")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listImports(@Param("clientId") clientId: string, @Query("bankAccountId") bankAccountId?: string) {
    return this.bankingService.listImports(clientId, bankAccountId);
  }

  @Get("unmatched")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  unmatched(@Param("clientId") clientId: string, @Query("bankAccountId") bankAccountId: string) {
    return this.bankingService.unmatched(clientId, bankAccountId);
  }

  @Post("auto-match")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  autoMatch(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: AutoMatchDto) {
    return this.bankingService.autoMatch(user, clientId, dto);
  }

  @Post("match")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  match(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: MatchLineDto) {
    return this.bankingService.match(user, clientId, dto);
  }

  @Post("unmatch")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  unmatch(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: UnmatchLineDto) {
    return this.bankingService.unmatch(user, clientId, dto.statementLineId);
  }

  @Post("statement-lines/:lineId/create-transaction")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  createTransaction(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("lineId") lineId: string,
    @Body() dto: CreateTransactionFromLineDto,
  ) {
    return this.bankingService.createTransactionFromLine(user, clientId, lineId, dto);
  }

  @Post("reconciliations")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  createReconciliation(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateReconciliationDto) {
    return this.bankingService.createReconciliation(user, clientId, dto);
  }

  @Get("reconciliations")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  listReconciliations(@Param("clientId") clientId: string, @Query("bankAccountId") bankAccountId?: string) {
    return this.bankingService.listReconciliations(clientId, bankAccountId);
  }

  @Get("reconciliations/:id/summary")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  summary(@Param("clientId") clientId: string, @Param("id") id: string) {
    return this.bankingService.reconciliationSummary(clientId, id);
  }

  @Post("reconciliations/:id/complete")
  @RequirePermissions(PERMISSIONS.MANAGE_BANKING)
  complete(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("id") id: string) {
    return this.bankingService.completeReconciliation(user, clientId, id);
  }
}
