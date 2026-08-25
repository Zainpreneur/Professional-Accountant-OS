import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type {
  CreateEvidenceDto,
  CreateFindingDto,
  CreateProcedureDto,
  CreateRiskDto,
  UpdateFindingDto,
  UpdateProcedureDto,
} from "./dto/audit-work.dto";
import type { RequestUser } from "../common/types";

// Audit fieldwork (SRS 33-34): risk register, audit programs/procedures
// against SRS 34's assertions, the evidence chain linking procedures and
// findings back to source documents (SRS 41), and findings. All scoped to
// one Engagement. Named "audit-work" (not "audit") to stay distinct from
// apps/api/src/audit/ - this app's audit *trail* (AuditLog) module.
@Injectable()
export class AuditWorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditService,
  ) {}

  private async assertEngagement(clientId: string, engagementId: string) {
    const engagement = await this.prisma.engagement.findUnique({ where: { id: engagementId } });
    if (!engagement || engagement.clientId !== clientId) throw new NotFoundException("Engagement not found");
    return engagement;
  }

  // --- Risks ---------------------------------------------------------------

  async listRisks(clientId: string, engagementId: string) {
    await this.assertEngagement(clientId, engagementId);
    return this.prisma.auditRisk.findMany({ where: { engagementId }, orderBy: { createdAt: "desc" } });
  }

  async createRisk(actor: RequestUser, clientId: string, engagementId: string, dto: CreateRiskDto) {
    await this.assertEngagement(clientId, engagementId);
    const risk = await this.prisma.auditRisk.create({
      data: { engagementId, ...dto, assertion: (dto.assertion as any) ?? null, createdById: actor.id } as any,
    });
    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_RISK_CREATED",
      entityType: "AuditRisk",
      entityId: risk.id,
      after: risk,
    });
    return risk;
  }

  // --- Procedures ------------------------------------------------------------

  async listProcedures(clientId: string, engagementId: string) {
    await this.assertEngagement(clientId, engagementId);
    return this.prisma.auditProcedure.findMany({ where: { engagementId }, include: { risk: true }, orderBy: { createdAt: "desc" } });
  }

  async createProcedure(actor: RequestUser, clientId: string, engagementId: string, dto: CreateProcedureDto) {
    await this.assertEngagement(clientId, engagementId);
    const procedure = await this.prisma.auditProcedure.create({
      data: { engagementId, ...dto } as any,
    });
    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_PROCEDURE_CREATED",
      entityType: "AuditProcedure",
      entityId: procedure.id,
      after: procedure,
    });
    return procedure;
  }

  async updateProcedure(actor: RequestUser, clientId: string, engagementId: string, procedureId: string, dto: UpdateProcedureDto) {
    await this.assertEngagement(clientId, engagementId);
    const before = await this.prisma.auditProcedure.findUnique({ where: { id: procedureId } });
    if (!before || before.engagementId !== engagementId) throw new NotFoundException("Procedure not found");

    const updated = await this.prisma.auditProcedure.update({
      where: { id: procedureId },
      data: {
        status: dto.status as any,
        conclusion: dto.conclusion,
        performedById: dto.status !== "NOT_STARTED" ? actor.id : before.performedById,
        performedAt: dto.status !== "NOT_STARTED" ? new Date() : before.performedAt,
      },
    });

    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_PROCEDURE_UPDATED",
      entityType: "AuditProcedure",
      entityId: procedureId,
      before: { status: before.status },
      after: { status: updated.status },
    });
    return updated;
  }

  // --- Evidence --------------------------------------------------------------

  async listEvidence(clientId: string, engagementId: string) {
    await this.assertEngagement(clientId, engagementId);
    return this.prisma.auditEvidence.findMany({ where: { engagementId }, include: { document: true }, orderBy: { createdAt: "desc" } });
  }

  async createEvidence(actor: RequestUser, clientId: string, engagementId: string, dto: CreateEvidenceDto) {
    await this.assertEngagement(clientId, engagementId);
    const evidence = await this.prisma.auditEvidence.create({
      data: { engagementId, ...dto, obtainedById: actor.id } as any,
    });
    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_EVIDENCE_ADDED",
      entityType: "AuditEvidence",
      entityId: evidence.id,
      after: evidence,
    });
    return evidence;
  }

  // --- Findings --------------------------------------------------------------

  async listFindings(clientId: string, engagementId: string) {
    await this.assertEngagement(clientId, engagementId);
    return this.prisma.auditFinding.findMany({ where: { engagementId }, orderBy: { createdAt: "desc" } });
  }

  async createFinding(actor: RequestUser, clientId: string, engagementId: string, dto: CreateFindingDto) {
    await this.assertEngagement(clientId, engagementId);
    const finding = await this.prisma.auditFinding.create({
      data: { engagementId, ...dto, assertion: (dto.assertion as any) ?? null, createdById: actor.id } as any,
    });
    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_FINDING_CREATED",
      entityType: "AuditFinding",
      entityId: finding.id,
      after: finding,
    });
    return finding;
  }

  async updateFinding(actor: RequestUser, clientId: string, engagementId: string, findingId: string, dto: UpdateFindingDto) {
    await this.assertEngagement(clientId, engagementId);
    const before = await this.prisma.auditFinding.findUnique({ where: { id: findingId } });
    if (!before || before.engagementId !== engagementId) throw new NotFoundException("Finding not found");

    const updated = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        status: dto.status as any,
        managementResponse: dto.managementResponse,
        resolvedAt: dto.status !== "OPEN" ? new Date() : null,
      },
    });

    await this.auditLog.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AUDIT_FINDING_UPDATED",
      entityType: "AuditFinding",
      entityId: findingId,
      before: { status: before.status },
      after: { status: updated.status },
    });
    return updated;
  }
}
