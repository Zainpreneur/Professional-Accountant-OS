import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { RequestUser } from "../../common/types";

// Fiscal years / accounting periods (SRS 11, 65). Periods can be OPEN,
// LOCKED (no new postings, but adjustments by authorized users still
// possible in a later phase), or CLOSED (final, no postings at all). The
// journal posting engine (journals.service.ts) enforces this.
@Injectable()
export class FiscalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listFiscalYears(clientId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { clientId },
      include: { periods: { orderBy: { startDate: "asc" } } },
      orderBy: { startDate: "desc" },
    });
  }

  listPeriods(clientId: string) {
    return this.prisma.accountingPeriod.findMany({ where: { clientId }, orderBy: { startDate: "asc" } });
  }

  async setPeriodStatus(actor: RequestUser, clientId: string, periodId: string, status: "OPEN" | "LOCKED" | "CLOSED") {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period || period.clientId !== clientId) throw new NotFoundException("Period not found");
    if (period.status === "CLOSED") {
      throw new BadRequestException("A closed period cannot be reopened through this endpoint");
    }

    const updated = await this.prisma.accountingPeriod.update({ where: { id: periodId }, data: { status } });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "PERIOD_STATUS_CHANGED",
      entityType: "AccountingPeriod",
      entityId: periodId,
      before: { status: period.status },
      after: { status: updated.status },
    });
    return updated;
  }
}
