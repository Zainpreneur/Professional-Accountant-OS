import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../rbac/permissions.guard";
import { ClientTenantGuard } from "../../rbac/tenant.guard";
import { RequirePermissions } from "../../rbac/permissions.decorator";
import { PERMISSIONS } from "../../rbac/permissions";
import { CurrentUser } from "../../common/current-user.decorator";
import { JournalsService } from "./journals.service";
import { CreateJournalDto } from "./dto/create-journal.dto";
import type { RequestUser } from "../../common/types";

class ReverseJournalDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/journals")
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  list(@Param("clientId") clientId: string, @Query("status") status?: string) {
    return this.journalsService.list(clientId, status);
  }

  @Get(":journalId")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("journalId") journalId: string) {
    return this.journalsService.get(clientId, journalId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CREATE_TRANSACTION)
  createDraft(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Body() dto: CreateJournalDto) {
    return this.journalsService.createDraft(user, clientId, dto);
  }

  @Post(":journalId/post")
  @RequirePermissions(PERMISSIONS.POST_TRANSACTION)
  post(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("journalId") journalId: string) {
    return this.journalsService.post(user, clientId, journalId);
  }

  @Post(":journalId/reverse")
  @RequirePermissions(PERMISSIONS.POST_TRANSACTION)
  reverse(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @Param("journalId") journalId: string,
    @Body() dto: ReverseJournalDto,
  ) {
    return this.journalsService.reverse(user, clientId, journalId, dto.reason, dto.date ? new Date(dto.date) : undefined);
  }
}
