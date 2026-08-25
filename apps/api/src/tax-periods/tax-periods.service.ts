import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ComplianceCalendarService } from "../compliance/compliance-calendar.service";
import type { CreateTaxPeriodDto } from "./dto/tax-period.dto";
import type { RequestUser } from "../common/types";

// Default statutory-deadline offsets from period end, by period type -
// approximations for the common case, not authoritative for every
// registrant category (e.g. large taxpayers may file VAT monthly with a
// different deadline). Override via CreateTaxPeriodDto.dueDate when the
// accountant knows the exact date.
const DEFAULT_DUE_OFFSET_DAYS: Record<string, number> = {
  VAT: 30,
  WHT: 10,
  ZAKAT: 120,
};

const DEADLINE_TITLE: Record<string, string> = {
  VAT: "VAT return due",
  WHT: "Withholding tax return due",
  ZAKAT: "Zakat return due",
};

// Shared filing-window concept behind VAT, WHT, and Zakat returns (SRS
// 25-28). Creating one auto-generates its Compliance Calendar deadline
// (SRS 47) in the same call, so a firm never has to remember to add both.
@Injectable()
export class TaxPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly complianceCalendar: ComplianceCalendarService,
  ) {}

  list(clientId: string, periodType?: string) {
    return this.prisma.taxPeriod.findMany({
      where: { clientId, ...(periodType ? { periodType: periodType as any } : {}) },
      orderBy: { startDate: "desc" },
    });
  }

  async create(actor: RequestUser, clientId: string, dto: CreateTaxPeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) throw new BadRequestException("endDate must be after startDate");

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : (() => {
          const d = new Date(endDate);
          d.setUTCDate(d.getUTCDate() + DEFAULT_DUE_OFFSET_DAYS[dto.periodType]);
          return d;
        })();

    const period = await this.prisma.taxPeriod.create({
      data: { clientId, periodType: dto.periodType, name: dto.name, startDate, endDate, dueDate },
    });

    await this.complianceCalendar.createDeadline(actor, clientId, {
      category: `${dto.periodType}_RETURN`,
      title: `${DEADLINE_TITLE[dto.periodType]} - ${dto.name}`,
      dueDate,
      relatedEntityType: "TaxPeriod",
      relatedEntityId: period.id,
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "TAX_PERIOD_CREATED",
      entityType: "TaxPeriod",
      entityId: period.id,
      after: period,
    });
    return period;
  }
}
