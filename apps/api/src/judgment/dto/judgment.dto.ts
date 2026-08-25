import { IsIn, IsOptional, IsString } from "class-validator";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export class CreateJudgmentCaseDto {
  @IsOptional()
  @IsString()
  engagementId?: string;

  @IsString()
  question!: string;

  @IsString()
  facts!: string;

  @IsOptional()
  @IsString()
  applicableStandards?: string;

  // Free-form list of candidate treatments the professional is weighing -
  // e.g. [{ "treatment": "Capitalize", "pros": "...", "cons": "..." }].
  // Filled by the professional (or, later, a real model call) - this app
  // never fabricates it. See ProfessionalJudgmentCase in schema.prisma.
  @IsOptional()
  possibleTreatments?: unknown;

  @IsOptional()
  @IsIn(RISK_LEVELS)
  risk?: string;
}

export class DecideJudgmentCaseDto {
  @IsString()
  decision!: string;

  @IsOptional()
  @IsString()
  recommendation?: string;
}
