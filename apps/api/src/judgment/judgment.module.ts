import { Module } from "@nestjs/common";
import { JudgmentController } from "./judgment.controller";
import { JudgmentService } from "./judgment.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [JudgmentController],
  providers: [JudgmentService],
})
export class JudgmentModule {}
