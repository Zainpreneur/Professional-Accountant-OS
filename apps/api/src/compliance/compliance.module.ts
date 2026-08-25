import { Module } from "@nestjs/common";
import { ComplianceCalendarController } from "./compliance-calendar.controller";
import { ComplianceCalendarService } from "./compliance-calendar.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [ComplianceCalendarController],
  providers: [ComplianceCalendarService],
  exports: [ComplianceCalendarService],
})
export class ComplianceModule {}
