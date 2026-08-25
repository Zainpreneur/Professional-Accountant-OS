-- CreateEnum
CREATE TYPE "AiAgentType" AS ENUM ('ACCOUNTING', 'TAX', 'AUDIT', 'RECONCILIATION', 'REPORTING', 'DOCUMENT', 'COMPLIANCE', 'FINANCIAL_ANALYST');

-- CreateEnum
CREATE TYPE "AiRecommendedAction" AS ENUM ('NO_ACTION_NEEDED', 'ESCALATE_TO_REVIEW', 'AUTO_POST_PERMITTED');

-- CreateEnum
CREATE TYPE "AiReviewSeverity" AS ENUM ('PROFESSIONAL_JUDGMENT', 'CA_REVIEW', 'ACCOUNTANT_REVIEW', 'CLIENT_CLARIFICATION', 'AUTO_VALIDATED');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('OPEN', 'REVIEWED');

-- CreateEnum
CREATE TYPE "AiReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'OVERRIDDEN');

-- CreateTable
CREATE TABLE "ai_agent_runs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agentType" "AiAgentType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "dataCompleteness" INTEGER NOT NULL,
    "evidenceQuality" TEXT NOT NULL,
    "ruleCertainty" TEXT NOT NULL,
    "risk" "RiskLevel" NOT NULL,
    "materiality" DECIMAL(18,2),
    "recommendedAction" "AiRecommendedAction" NOT NULL,
    "reviewSeverity" "AiReviewSeverity" NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "AiRunStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewDecision" "AiReviewDecision",
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_agent_runs_clientId_status_idx" ON "ai_agent_runs"("clientId", "status");

-- CreateIndex
CREATE INDEX "ai_agent_runs_clientId_agentType_idx" ON "ai_agent_runs"("clientId", "agentType");

-- AddForeignKey
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
