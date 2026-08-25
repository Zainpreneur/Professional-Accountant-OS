import { Module } from "@nestjs/common";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
import { AuditModule } from "../audit/audit.module";
import { BusinessCompilerModule } from "../business-compiler/business-compiler.module";

@Module({
  imports: [AuditModule, BusinessCompilerModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
