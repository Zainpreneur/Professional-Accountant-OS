import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

const ASSERTIONS = [
  "EXISTENCE",
  "COMPLETENESS",
  "ACCURACY",
  "CUTOFF",
  "CLASSIFICATION",
  "RIGHTS_AND_OBLIGATIONS",
  "VALUATION",
  "PRESENTATION",
  "DISCLOSURE",
];
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export class CreateRiskDto {
  @IsString()
  description!: string;

  @IsIn(["INHERENT", "CONTROL", "DETECTION", "FRAUD"])
  category!: string;

  @IsOptional()
  @IsIn(ASSERTIONS)
  assertion?: string;

  @IsIn(RISK_LEVELS)
  likelihood!: string;

  @IsIn(RISK_LEVELS)
  impact!: string;

  @IsOptional()
  isSignificant?: boolean;

  @IsOptional()
  @IsString()
  response?: string;
}

export class CreateProcedureDto {
  @IsOptional()
  @IsString()
  riskId?: string;

  @IsIn(ASSERTIONS)
  assertion!: string;

  @IsIn(["CONTROL_TEST", "SUBSTANTIVE_TEST", "ANALYTICAL_PROCEDURE"])
  procedureType!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sampleSize?: number;
}

export class UpdateProcedureDto {
  @IsIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
  status!: string;

  @IsOptional()
  @IsString()
  conclusion?: string;
}

export class CreateEvidenceDto {
  @IsOptional()
  @IsString()
  procedureId?: string;

  @IsOptional()
  @IsString()
  findingId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsString()
  description!: string;

  @IsIn(["DOCUMENT", "CONFIRMATION", "OBSERVATION", "INQUIRY", "RECALCULATION", "EXTERNAL", "INTERNAL"])
  evidenceType!: string;
}

export class CreateFindingDto {
  @IsOptional()
  @IsString()
  procedureId?: string;

  @IsOptional()
  @IsString()
  riskId?: string;

  @IsIn(["EXCEPTION", "MISSTATEMENT", "CONTROL_DEFICIENCY"])
  type!: string;

  @IsOptional()
  @IsIn(ASSERTIONS)
  assertion?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsIn(RISK_LEVELS)
  severity!: string;

  @IsOptional()
  @IsString()
  recommendation?: string;
}

export class UpdateFindingDto {
  @IsIn(["OPEN", "RESOLVED", "ACCEPTED"])
  status!: string;

  @IsOptional()
  @IsString()
  managementResponse?: string;
}
