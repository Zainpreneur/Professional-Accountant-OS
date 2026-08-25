import { Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ClientTenantGuard } from "../rbac/tenant.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { CurrentUser } from "../common/current-user.decorator";
import { EInvoiceService } from "./einvoice.service";
import type { RequestUser } from "../common/types";

@UseGuards(JwtAuthGuard, PermissionsGuard, ClientTenantGuard)
@Controller("clients/:clientId/invoices/:invoiceId/einvoice")
export class EInvoiceController {
  constructor(private readonly einvoiceService: EInvoiceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  get(@Param("clientId") clientId: string, @Param("invoiceId") invoiceId: string) {
    return this.einvoiceService.get(clientId, invoiceId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MANAGE_SALES)
  generate(@CurrentUser() user: RequestUser, @Param("clientId") clientId: string, @Param("invoiceId") invoiceId: string) {
    return this.einvoiceService.generate(user, clientId, invoiceId);
  }

  @Get("qr.png")
  @RequirePermissions(PERMISSIONS.VIEW_CLIENT)
  async qrPng(@Param("clientId") clientId: string, @Param("invoiceId") invoiceId: string, @Res() res: Response) {
    const png = await this.einvoiceService.getQrPng(clientId, invoiceId);
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  }
}
