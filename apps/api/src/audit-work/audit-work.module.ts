import { Module } from "@nestjs/common";
import { AuditWorkController } from "./audit-work.controller";
import { AuditWorkService } from "./audit-work.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [AuditWorkController],
  providers: [AuditWorkService],
})
export class AuditWorkModule {}
