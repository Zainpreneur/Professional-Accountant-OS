import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ReportsService } from "../reports/reports.service";
import { ComplianceCalendarService } from "../compliance/compliance-calendar.service";
import { AGENT_SCANS, type AgentContext, type FindingInput } from "./ai-workforce.agents";
import type { ReviewFindingDto } from "./dto/ai-workforce.dto";
import type { RequestUser } from "../common/types";

const REVIEW_SEVERITY_ORDER = ["PROFESSIONAL_JUDGMENT", "CA_REVIEW", "ACCOUNTANT_REVIEW", "CLIENT_CLARIFICATION", "AUTO_VALIDATED"] as const;

// AI Workforce (SRS 37-39, 66-68) - see ai-workforce.agents.ts for what
// each agent actually looks at. This service is the durable half of the
// pipeline: persisting findings (RECORD EVIDENCE) and running the
// Professional Review Queue (SRS 68) a human acts on. No method here ever
// writes to a domain table outside ai_agent_runs - reviewing a finding
// records a human decision about it, it does not execute anything on the
// finding's behalf (SRS 4).
@Injectable()
export class AiWorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reports: ReportsService,
    private readonly compliance: ComplianceCalendarService,
  ) {}

  private get context(): AgentContext {
    return { prisma: this.prisma, reports: this.reports, compliance: this.compliance };
  }

  async runAgent(actor: RequestUser, clientId: string, agentType: string) {
    const scan = AGENT_SCANS[agentType];
    if (!scan) throw new BadRequestException(`Unknown agent type: ${agentType}`);

    const findings = await scan(this.context, clientId);
    const created = [];
    for (const finding of findings) {
      const row = await this.persistFinding(clientId, agentType, finding);
      if (row) created.push(row);
    }

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AI_AGENT_RUN",
      entityType: "AiAgentRun",
      entityId: agentType,
      after: { agentType, findingsScanned: findings.length, findingsCreated: created.length },
    });

    return { agentType, findingsScanned: findings.length, findingsCreated: created };
  }

  async runAll(actor: RequestUser, clientId: string) {
    const results: Record<string, Awaited<ReturnType<AiWorkforceService["runAgent"]>>> = {};
    for (const agentType of Object.keys(AGENT_SCANS)) {
      results[agentType] = await this.runAgent(actor, clientId, agentType);
    }
    return results;
  }

  // Idempotent-ish: skips creating a new row if an identical still-open
  // finding (same client/agent/entity/title) already exists, so re-running
  // an agent doesn't spam duplicates of a condition that hasn't changed.
  // Titles that embed a computed value (e.g. an age in days) will still
  // create a fresh row as that value changes - acceptable for a v1 that's
  // meant to be re-run periodically, not a source of silent staleness.
  private async persistFinding(clientId: string, agentType: string, finding: FindingInput) {
    const existing = await this.prisma.aiAgentRun.findFirst({
      where: {
        clientId,
        agentType: agentType as any,
        entityType: finding.entityType ?? null,
        entityId: finding.entityId ?? null,
        title: finding.title,
        status: "OPEN",
      },
    });
    if (existing) return null;

    return this.prisma.aiAgentRun.create({
      data: {
        clientId,
        agentType: agentType as any,
        entityType: finding.entityType,
        entityId: finding.entityId,
        title: finding.title,
        observation: finding.observation,
        reasoning: finding.reasoning,
        confidence: finding.confidence,
        dataCompleteness: finding.dataCompleteness,
        evidenceQuality: finding.evidenceQuality,
        ruleCertainty: finding.ruleCertainty,
        risk: finding.risk as any,
        materiality: finding.materiality,
        recommendedAction: finding.recommendedAction as any,
        reviewSeverity: finding.reviewSeverity as any,
      },
    });
  }

  async queue(clientId: string, status?: string) {
    const runs = await this.prisma.aiAgentRun.findMany({
      where: { clientId, status: (status as any) ?? "OPEN" },
      include: { reviewedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const bySeverity: Record<string, typeof runs> = {};
    for (const severity of REVIEW_SEVERITY_ORDER) bySeverity[severity] = [];
    for (const run of runs) bySeverity[run.reviewSeverity].push(run);

    return { runs, bySeverity, severityOrder: REVIEW_SEVERITY_ORDER };
  }

  async listRuns(clientId: string, agentType?: string) {
    return this.prisma.aiAgentRun.findMany({
      where: { clientId, ...(agentType ? { agentType: agentType as any } : {}) },
      include: { reviewedBy: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async review(actor: RequestUser, clientId: string, runId: string, dto: ReviewFindingDto) {
    const run = await this.prisma.aiAgentRun.findUnique({ where: { id: runId } });
    if (!run || run.clientId !== clientId) throw new NotFoundException("AI agent finding not found");
    if (run.status !== "OPEN") throw new BadRequestException("This finding has already been reviewed");

    const updated = await this.prisma.aiAgentRun.update({
      where: { id: runId },
      data: {
        status: "REVIEWED",
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewDecision: dto.decision as any,
        reviewNotes: dto.notes,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "AI_FINDING_REVIEWED",
      entityType: "AiAgentRun",
      entityId: runId,
      before: { status: run.status },
      after: { status: updated.status, decision: dto.decision },
    });
    return updated;
  }
}
