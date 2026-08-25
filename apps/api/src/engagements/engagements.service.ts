import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AddTeamMemberDto, ConcludeEngagementDto, CreateEngagementDto, UpdateCompletionItemDto } from "./dto/engagement.dto";
import type { RequestUser } from "../common/types";

// Standard completion checklist seeded when an engagement enters completion
// (SRS 33 "Completion"). A firm can add more items via the same endpoint
// used to update one - there's no fixed schema, just @@unique([engagementId, item]).
const STANDARD_COMPLETION_CHECKLIST = [
  "Subsequent events reviewed",
  "Going concern assessed",
  "Management representation letter obtained",
  "All significant findings addressed or accepted",
  "Financial statements agree to the trial balance",
];

// Engagements (SRS 33 "Engagement", SRS 77). Acceptance/materiality/team
// happen up front; conclude() and approve() close it out with identity-
// enforced segregation of duties (SRS 55) - approve() rejects an approver
// who is the same user who concluded, regardless of what permissions that
// user holds.
@Injectable()
export class EngagementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.engagement.findMany({
      where: { clientId },
      include: { teamMembers: { include: { user: true } }, createdBy: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(clientId: string, engagementId: string) {
    const engagement = await this.prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        teamMembers: { include: { user: true } },
        independenceChecks: { include: { checkedBy: true, resolvedBy: true } },
        completionItems: true,
        createdBy: true,
        concludedBy: true,
        approvedBy: true,
      },
    });
    if (!engagement || engagement.clientId !== clientId) throw new NotFoundException("Engagement not found");
    return engagement;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateEngagementDto) {
    const engagement = await this.prisma.engagement.create({
      data: {
        clientId,
        serviceType: dto.serviceType,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        materialityAmount: dto.materialityAmount,
        materialityBasis: dto.materialityBasis,
        scope: dto.scope,
        createdById: actor.id,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ENGAGEMENT_CREATED",
      entityType: "Engagement",
      entityId: engagement.id,
      after: engagement,
    });
    return engagement;
  }

  async setAcceptance(actor: RequestUser, clientId: string, engagementId: string, accepted: boolean) {
    const engagement = await this.get(clientId, engagementId);
    const updated = await this.prisma.engagement.update({
      where: { id: engagementId },
      data: {
        acceptanceStatus: accepted ? "ACCEPTED" : "DECLINED",
        status: accepted ? "IN_PROGRESS" : "CANCELLED",
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: accepted ? "ENGAGEMENT_ACCEPTED" : "ENGAGEMENT_DECLINED",
      entityType: "Engagement",
      entityId: engagementId,
      before: { acceptanceStatus: engagement.acceptanceStatus },
      after: { acceptanceStatus: updated.acceptanceStatus },
    });
    return updated;
  }

  async addTeamMember(actor: RequestUser, clientId: string, engagementId: string, dto: AddTeamMemberDto) {
    await this.get(clientId, engagementId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.firmId !== actor.firmId) throw new BadRequestException("User not found in this firm");

    const member = await this.prisma.engagementTeamMember.create({
      data: { engagementId, userId: dto.userId, role: dto.role as any },
      include: { user: true },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ENGAGEMENT_TEAM_MEMBER_ADDED",
      entityType: "Engagement",
      entityId: engagementId,
      after: { userId: dto.userId, role: dto.role },
    });
    return member;
  }

  // Idempotent: safe to call again later to top up with any checklist items
  // added to STANDARD_COMPLETION_CHECKLIST since the engagement started.
  async startCompletion(actor: RequestUser, clientId: string, engagementId: string) {
    await this.get(clientId, engagementId);
    const existing = await this.prisma.engagementCompletionItem.findMany({ where: { engagementId } });
    const existingItems = new Set(existing.map((i) => i.item));
    const toCreate = STANDARD_COMPLETION_CHECKLIST.filter((item) => !existingItems.has(item));

    if (toCreate.length > 0) {
      await this.prisma.engagementCompletionItem.createMany({
        data: toCreate.map((item) => ({ engagementId, item })),
      });
      await this.audit.log({
        firmId: actor.firmId,
        clientId,
        userId: actor.id,
        action: "ENGAGEMENT_COMPLETION_STARTED",
        entityType: "Engagement",
        entityId: engagementId,
        after: { itemsAdded: toCreate },
      });
    }
    return this.prisma.engagementCompletionItem.findMany({ where: { engagementId } });
  }

  async updateCompletionItem(actor: RequestUser, clientId: string, engagementId: string, itemId: string, dto: UpdateCompletionItemDto) {
    const item = await this.prisma.engagementCompletionItem.findUnique({ where: { id: itemId } });
    if (!item || item.engagementId !== engagementId) throw new NotFoundException("Completion item not found");
    await this.get(clientId, engagementId);

    const updated = await this.prisma.engagementCompletionItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        notes: dto.notes,
        completedById: dto.status === "PENDING" ? null : actor.id,
        completedAt: dto.status === "PENDING" ? null : new Date(),
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ENGAGEMENT_COMPLETION_ITEM_UPDATED",
      entityType: "EngagementCompletionItem",
      entityId: itemId,
      before: { status: item.status },
      after: { status: updated.status },
    });
    return updated;
  }

  // Drafts the conclusion. Requires every completion item to be resolved
  // (COMPLETE or NOT_APPLICABLE) first - the checklist exists to be used,
  // not bypassed.
  async conclude(actor: RequestUser, clientId: string, engagementId: string, dto: ConcludeEngagementDto) {
    const engagement = await this.get(clientId, engagementId);
    if (engagement.status === "COMPLETED") throw new BadRequestException("Engagement is already completed");

    const outstanding = engagement.completionItems.filter((i) => i.status === "PENDING");
    if (outstanding.length > 0) {
      throw new BadRequestException(
        `${outstanding.length} completion checklist item(s) still pending: ${outstanding.map((i) => i.item).join(", ")}`,
      );
    }

    const updated = await this.prisma.engagement.update({
      where: { id: engagementId },
      data: { conclusionText: dto.conclusionText, concludedById: actor.id, concludedAt: new Date() },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ENGAGEMENT_CONCLUDED",
      entityType: "Engagement",
      entityId: engagementId,
      after: { conclusionText: dto.conclusionText },
    });
    return updated;
  }

  // Final partner sign-off. Enforces segregation of duties by identity
  // (SRS 55): whoever approves must not be the same user who drafted the
  // conclusion, even if that user also holds APPROVE_AUDIT.
  async approve(actor: RequestUser, clientId: string, engagementId: string) {
    const engagement = await this.get(clientId, engagementId);
    if (!engagement.concludedById) throw new BadRequestException("Engagement has not been concluded yet");
    if (engagement.approvedById) throw new BadRequestException("Engagement is already approved");
    if (engagement.concludedById === actor.id) {
      throw new ForbiddenException("The engagement conclusion must be approved by someone other than who drafted it");
    }

    const updated = await this.prisma.engagement.update({
      where: { id: engagementId },
      data: { approvedById: actor.id, approvedAt: new Date(), status: "COMPLETED" },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ENGAGEMENT_APPROVED",
      entityType: "Engagement",
      entityId: engagementId,
      after: { approvedById: actor.id },
    });
    return updated;
  }
}
