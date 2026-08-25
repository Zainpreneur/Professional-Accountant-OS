/*
  Warnings:

  - Added the required column `createdById` to the `engagements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "IndependenceStatus" AS ENUM ('CLEARED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "EngagementTeamRole" AS ENUM ('PARTNER', 'MANAGER', 'SENIOR', 'STAFF');

-- CreateEnum
CREATE TYPE "IndependenceResolution" AS ENUM ('PENDING', 'SAFEGUARDED', 'DECLINED_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "AuditRiskCategory" AS ENUM ('INHERENT', 'CONTROL', 'DETECTION', 'FRAUD');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AuditAssertion" AS ENUM ('EXISTENCE', 'COMPLETENESS', 'ACCURACY', 'CUTOFF', 'CLASSIFICATION', 'RIGHTS_AND_OBLIGATIONS', 'VALUATION', 'PRESENTATION', 'DISCLOSURE');

-- CreateEnum
CREATE TYPE "AuditProcedureType" AS ENUM ('CONTROL_TEST', 'SUBSTANTIVE_TEST', 'ANALYTICAL_PROCEDURE');

-- CreateEnum
CREATE TYPE "AuditProcedureStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AuditEvidenceType" AS ENUM ('DOCUMENT', 'CONFIRMATION', 'OBSERVATION', 'INQUIRY', 'RECALCULATION', 'EXTERNAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AuditFindingType" AS ENUM ('EXCEPTION', 'MISSTATEMENT', 'CONTROL_DEFICIENCY');

-- CreateEnum
CREATE TYPE "AuditFindingSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AuditFindingStatus" AS ENUM ('OPEN', 'RESOLVED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "CompletionItemStatus" AS ENUM ('PENDING', 'COMPLETE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "JudgmentStatus" AS ENUM ('OPEN', 'DECIDED', 'APPROVED');

-- CreateEnum
CREATE TYPE "JudgmentRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "engagements" ADD COLUMN     "acceptanceStatus" "AcceptanceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "concludedById" TEXT,
ADD COLUMN     "conclusionText" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "independenceStatus" "IndependenceStatus",
ADD COLUMN     "materialityAmount" DECIMAL(18,2),
ADD COLUMN     "materialityBasis" TEXT,
ADD COLUMN     "scope" TEXT;

-- CreateTable
CREATE TABLE "engagement_team_members" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EngagementTeamRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "independence_checks" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "hasFinancialInterest" BOOLEAN NOT NULL DEFAULT false,
    "hasCloseRelationship" BOOLEAN NOT NULL DEFAULT false,
    "hasPriorEngagementConflict" BOOLEAN NOT NULL DEFAULT false,
    "hasProhibitedActivity" BOOLEAN NOT NULL DEFAULT false,
    "selfReviewThreat" BOOLEAN NOT NULL DEFAULT false,
    "familiarityThreat" BOOLEAN NOT NULL DEFAULT false,
    "advocacyThreat" BOOLEAN NOT NULL DEFAULT false,
    "managementParticipationThreat" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "IndependenceStatus" NOT NULL,
    "checkedById" TEXT NOT NULL,
    "resolution" "IndependenceResolution" NOT NULL DEFAULT 'PENDING',
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "independence_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_risks" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AuditRiskCategory" NOT NULL,
    "assertion" "AuditAssertion",
    "likelihood" "RiskLevel" NOT NULL,
    "impact" "RiskLevel" NOT NULL,
    "isSignificant" BOOLEAN NOT NULL DEFAULT false,
    "response" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_procedures" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "riskId" TEXT,
    "assertion" "AuditAssertion" NOT NULL,
    "procedureType" "AuditProcedureType" NOT NULL,
    "description" TEXT NOT NULL,
    "sampleSize" INTEGER,
    "status" "AuditProcedureStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3),
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_evidence" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "procedureId" TEXT,
    "findingId" TEXT,
    "documentId" TEXT,
    "description" TEXT NOT NULL,
    "evidenceType" "AuditEvidenceType" NOT NULL,
    "obtainedById" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "procedureId" TEXT,
    "riskId" TEXT,
    "type" "AuditFindingType" NOT NULL,
    "assertion" "AuditAssertion",
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "severity" "AuditFindingSeverity" NOT NULL,
    "recommendation" TEXT,
    "managementResponse" TEXT,
    "status" "AuditFindingStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_completion_items" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" "CompletionItemStatus" NOT NULL DEFAULT 'PENDING',
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_completion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_judgment_cases" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "engagementId" TEXT,
    "question" TEXT NOT NULL,
    "facts" TEXT NOT NULL,
    "applicableStandards" TEXT,
    "possibleTreatments" JSONB,
    "recommendation" TEXT,
    "risk" "JudgmentRisk" NOT NULL DEFAULT 'MEDIUM',
    "status" "JudgmentStatus" NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_judgment_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "engagement_team_members_engagementId_userId_key" ON "engagement_team_members"("engagementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_completion_items_engagementId_item_key" ON "engagement_completion_items"("engagementId", "item");

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_concludedById_fkey" FOREIGN KEY ("concludedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_team_members" ADD CONSTRAINT "engagement_team_members_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_team_members" ADD CONSTRAINT "engagement_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "independence_checks" ADD CONSTRAINT "independence_checks_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "independence_checks" ADD CONSTRAINT "independence_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "independence_checks" ADD CONSTRAINT "independence_checks_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_risks" ADD CONSTRAINT "audit_risks_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_risks" ADD CONSTRAINT "audit_risks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_procedures" ADD CONSTRAINT "audit_procedures_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_procedures" ADD CONSTRAINT "audit_procedures_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "audit_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_procedures" ADD CONSTRAINT "audit_procedures_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "audit_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "audit_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_obtainedById_fkey" FOREIGN KEY ("obtainedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "audit_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "audit_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_completion_items" ADD CONSTRAINT "engagement_completion_items_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_completion_items" ADD CONSTRAINT "engagement_completion_items_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_judgment_cases" ADD CONSTRAINT "professional_judgment_cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_judgment_cases" ADD CONSTRAINT "professional_judgment_cases_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_judgment_cases" ADD CONSTRAINT "professional_judgment_cases_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_judgment_cases" ADD CONSTRAINT "professional_judgment_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_judgment_cases" ADD CONSTRAINT "professional_judgment_cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
