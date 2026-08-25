import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BusinessCompilerService } from "./business-compiler.service";

// Firm-wide catalog endpoints (not client-scoped - these describe what a
// *new* client could be, so there's no client yet to tenant-guard against).
@UseGuards(JwtAuthGuard)
@Controller("business-compiler")
export class BusinessCompilerController {
  constructor(private readonly compiler: BusinessCompilerService) {}

  @Get("categories")
  listCategories() {
    return this.compiler.listCategories();
  }

  @Get("jurisdictions")
  listJurisdictions() {
    return this.compiler.listJurisdictions();
  }
}
