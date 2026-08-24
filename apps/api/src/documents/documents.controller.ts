import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { DocumentsService } from "./documents.service";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_DOCUMENTS)
  list(@Param("clientId") clientId: string) {
    return this.documentsService.list(clientId);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  @RequirePermissions(PERMISSIONS.MANAGE_DOCUMENTS)
  upload(
    @CurrentUser() user: RequestUser,
    @Param("clientId") clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("category") category?: string,
  ) {
    return this.documentsService.upload(user, clientId, file, category);
  }

  @Get(":documentId/download")
  @RequirePermissions(PERMISSIONS.VIEW_DOCUMENTS)
  async download(@Param("clientId") clientId: string, @Param("documentId") documentId: string, @Res() res: Response) {
    const { document, stream } = await this.documentsService.getStream(clientId, documentId);
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${document.fileName}"`);
    stream.pipe(res);
  }
}
