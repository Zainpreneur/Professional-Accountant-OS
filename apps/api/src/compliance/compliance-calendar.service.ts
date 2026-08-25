import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateComplianceDeadlineDto } from "./dto/compliance.dto";
import type { RequestUser } from "../common/types";

export type ComplianceBucket = "OVERDUE" | "DUE_TODAY" | "DUE_THIS_WEEK" | "DUE_THIS_MONTH" | "UPCOMING" | "COMPLETED";

// Compliance Calendar (SRS 47). Deadlines are generated automatically from
// tax periods (TaxPeriodsService calls createDeadline on period creation)
// and can also be entered manually for anything else (CR renewal, GOSI,
// municipal license, ...). Bucketing is computed on read, never stored, so
// "OVERDUE" is always accurate as of the moment the dashboard is viewed.
@Injectable()
export class ComplianceCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private bucketOf(dueDate: Date, status: string, now: Date): ComplianceBucket {
    if (status === "COMPLETED") return "COMPLETED";

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const due = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

    if (due.getTime() < today.getTime()) return "OVERDUE";
    if (due.getTime() === today.getTime()) return "DUE_TODAY";
    if (due.getTime() <= weekEnd.getTime()) return "DUE_THIS_WEEK";
    if (due.getTime() <= monthEnd.getTime()) return "DUE_THIS_MONTH";
    return "UPCOMING";
  }

  async list(clientId: string) {
    const deadlines = await this.prisma.complianceDeadline.findMany({ where: { clientId }, orderBy: { dueDate: "asc" } });
    const now = new Date();

    const withBuckets = deadlines.map((d) => ({ ...d, bucket: this.bucketOf(d.dueDate, d.status, now) }));

    const buckets: Record<ComplianceBucket, typeof withBuckets> = {
      OVERDUE: [],
      DUE_TODAY: [],
      DUE_THIS_WEEK: [],
      DUE_THIS_MONTH: [],
      UPCOMING: [],
      COMPLETED: [],
    };
    for (const d of withBuckets) buckets[d.bucket].push(d);

    return { deadlines: withBuckets, buckets };
  }

  async createCustom(actor: RequestUser, clientId: string, dto: CreateComplianceDeadlineDto) {
    return this.createDeadline(actor, clientId, {
      category: "CUSTOM",
      title: dto.title,
      dueDate: new Date(dto.dueDate),
      notes: dto.notes,
    });
  }

  // Called by TaxPeriodsService (and available to any future module) to
  // auto-generate a deadline tied back to a source record - never called
  // directly over HTTP.
  async createDeadline(
    actor: RequestUser,
    clientId: string,
    input: {
      category: string;
      title: string;
      dueDate: Date;
      notes?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
  ) {
    const deadline = await this.prisma.complianceDeadline.create({
      data: {
        clientId,
        category: input.category,
        title: input.title,
        dueDate: input.dueDate,
        notes: input.notes,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
    });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "COMPLIANCE_DEADLINE_CREATED",
      entityType: "ComplianceDeadline",
      entityId: deadline.id,
      after: deadline,
    });
    return deadline;
  }

  async complete(actor: RequestUser, clientId: string, deadlineId: string) {
    const deadline = await this.prisma.complianceDeadline.findUnique({ where: { id: deadlineId } });
    if (!deadline || deadline.clientId !== clientId) throw new NotFoundException("Deadline not found");
    if (deadline.status === "COMPLETED") throw new BadRequestException("Deadline is already completed");

    const updated = await this.prisma.complianceDeadline.update({
      where: { id: deadlineId },
      data: { status: "COMPLETED", completedById: actor.id, completedAt: new Date() },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "COMPLIANCE_DEADLINE_COMPLETED",
      entityType: "ComplianceDeadline",
      entityId: deadlineId,
    });
    return updated;
  }
}
