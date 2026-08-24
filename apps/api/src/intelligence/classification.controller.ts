import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { ClassificationService } from "./classification.service";

class SuggestAccountDto {
  @IsString()
  @MinLength(2)
  description!: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/classification")
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  @Post("suggest-account")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  suggestAccount(@Param("clientId") clientId: string, @Body() dto: SuggestAccountDto) {
    return this.classificationService.suggestAccount(clientId, dto.description);
  }
}
