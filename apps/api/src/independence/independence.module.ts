import { Module } from "@nestjs/common";
import { IndependenceController } from "./independence.controller";
import { IndependenceService } from "./independence.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [IndependenceController],
  providers: [IndependenceService],
})
export class IndependenceModule {}
