import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateJudgmentCaseDto, DecideJudgmentCaseDto } from "./dto/judgment.dto";
import type { RequestUser } from "../common/types";

// Professional Judgment Engine (SRS 35): Question -> Facts -> Applicable
// standards -> Possible treatments -> Professional decision -> Approval.
// Deliberately does not auto-generate "AI analysis"/"AI recommendation"
// text (no LLM is wired into this app process, and a plausible-sounding
// fabricated recommendation would be actively misleading, unlike a
// numeric heuristic such as Phase 2's classification suggester) -
// `possibleTreatments`/`recommendation`/`decision` are filled in by the
// professional. `decidedById` and `approvedById` are enforced distinct.
@Injectable()
export class JudgmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.professionalJudgmentCase.findMany({
      where: { clientId },
      include: { createdBy: true, decidedBy: true, approvedBy: true, engagement: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(clientId: string, caseId: string) {
    const judgmentCase = await this.prisma.professionalJudgmentCase.findUnique({
      where: { id: caseId },
      include: { createdBy: true, decidedBy: true, approvedBy: true, engagement: true },
    });
    if (!judgmentCase || judgmentCase.clientId !== clientId) throw new NotFoundException("Judgment case not found");
    return judgmentCase;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateJudgmentCaseDto) {
    if (dto.engagementId) {
      const engagement = await this.prisma.engagement.findUnique({ where: { id: dto.engagementId } });
      if (!engagement || engagement.clientId !== clientId) throw new BadRequestException("Engagement not found");
    }

    const judgmentCase = await this.prisma.professionalJudgmentCase.create({
      data: {
        clientId,
        engagementId: dto.engagementId,
        question: dto.question,
        facts: dto.facts,
        applicableStandards: dto.applicableStandards,
        possibleTreatments: dto.possibleTreatments as any,
        risk: (dto.risk as any) ?? "MEDIUM",
        createdById: actor.id,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "JUDGMENT_CASE_CREATED",
      entityType: "ProfessionalJudgmentCase",
      entityId: judgmentCase.id,
      after: judgmentCase,
    });
    return judgmentCase;
  }

  async decide(actor: RequestUser, clientId: string, caseId: string, dto: DecideJudgmentCaseDto) {
    const judgmentCase = await this.get(clientId, caseId);
    if (judgmentCase.status !== "OPEN") throw new BadRequestException("Only an open case can be decided");

    const updated = await this.prisma.professionalJudgmentCase.update({
      where: { id: caseId },
      data: {
        decision: dto.decision,
        recommendation: dto.recommendation,
        decidedById: actor.id,
        decidedAt: new Date(),
        status: "DECIDED",
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "JUDGMENT_CASE_DECIDED",
      entityType: "ProfessionalJudgmentCase",
      entityId: caseId,
      after: { decision: dto.decision },
    });
    return updated;
  }

  async approve(actor: RequestUser, clientId: string, caseId: string) {
    const judgmentCase = await this.get(clientId, caseId);
    if (judgmentCase.status !== "DECIDED") throw new BadRequestException("Only a decided case can be approved");
    if (judgmentCase.decidedById === actor.id) {
      throw new ForbiddenException("A judgment decision must be approved by someone other than who made it");
    }

    const updated = await this.prisma.professionalJudgmentCase.update({
      where: { id: caseId },
      data: { approvedById: actor.id, approvedAt: new Date(), status: "APPROVED" },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "JUDGMENT_CASE_APPROVED",
      entityType: "ProfessionalJudgmentCase",
      entityId: caseId,
      after: { approvedById: actor.id },
    });
    return updated;
  }
}
