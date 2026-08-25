import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateIndependenceCheckDto, ResolveIndependenceCheckDto } from "./dto/independence.dto";
import type { RequestUser } from "../common/types";

const THREAT_FIELDS = [
  "hasFinancialInterest",
  "hasCloseRelationship",
  "hasPriorEngagementConflict",
  "hasProhibitedActivity",
  "selfReviewThreat",
  "familiarityThreat",
  "advocacyThreat",
  "managementParticipationThreat",
] as const;

// Independence Engine (SRS 36). Any threat flag => EXCEPTION, which
// escalates (it's visible on the engagement and must be explicitly
// resolved). Resolving an exception is enforced distinct from logging it -
// the same preparer-!=-approver identity check used on engagement
// conclusion (SRS 55).
@Injectable()
export class IndependenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(clientId: string, engagementId: string) {
    await this.assertEngagement(clientId, engagementId);
    return this.prisma.independenceCheck.findMany({
      where: { engagementId },
      include: { checkedBy: true, resolvedBy: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(actor: RequestUser, clientId: string, engagementId: string, dto: CreateIndependenceCheckDto) {
    await this.assertEngagement(clientId, engagementId);

    const hasThreat = THREAT_FIELDS.some((field) => dto[field] === true);
    const status = hasThreat ? "EXCEPTION" : "CLEARED";

    const check = await this.prisma.$transaction(async (tx) => {
      const created = await tx.independenceCheck.create({
        data: {
          engagementId,
          ...Object.fromEntries(THREAT_FIELDS.map((f) => [f, dto[f] ?? false])),
          notes: dto.notes,
          status,
          checkedById: actor.id,
        },
      });
      await tx.engagement.update({ where: { id: engagementId }, data: { independenceStatus: status } });
      return created;
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "INDEPENDENCE_CHECK_LOGGED",
      entityType: "IndependenceCheck",
      entityId: check.id,
      after: { status },
    });
    return check;
  }

  async resolve(actor: RequestUser, clientId: string, engagementId: string, checkId: string, dto: ResolveIndependenceCheckDto) {
    await this.assertEngagement(clientId, engagementId);
    const check = await this.prisma.independenceCheck.findUnique({ where: { id: checkId } });
    if (!check || check.engagementId !== engagementId) throw new NotFoundException("Independence check not found");
    if (check.status !== "EXCEPTION") throw new BadRequestException("Only an exception needs resolving");
    if (check.resolution !== "PENDING") throw new BadRequestException("This exception has already been resolved");
    if (check.checkedById === actor.id) {
      throw new ForbiddenException("An independence exception must be resolved by someone other than who logged it");
    }

    const resolved = await this.prisma.independenceCheck.update({
      where: { id: checkId },
      data: { resolution: dto.resolution, resolutionNotes: dto.resolutionNotes, resolvedById: actor.id, resolvedAt: new Date() },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "INDEPENDENCE_EXCEPTION_RESOLVED",
      entityType: "IndependenceCheck",
      entityId: checkId,
      after: { resolution: dto.resolution },
    });
    return resolved;
  }

  private async assertEngagement(clientId: string, engagementId: string) {
    const engagement = await this.prisma.engagement.findUnique({ where: { id: engagementId } });
    if (!engagement || engagement.clientId !== clientId) throw new NotFoundException("Engagement not found");
    return engagement;
  }
}
