import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class CreateIndependenceCheckDto {
  @IsOptional()
  @IsBoolean()
  hasFinancialInterest?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCloseRelationship?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPriorEngagementConflict?: boolean;

  @IsOptional()
  @IsBoolean()
  hasProhibitedActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  selfReviewThreat?: boolean;

  @IsOptional()
  @IsBoolean()
  familiarityThreat?: boolean;

  @IsOptional()
  @IsBoolean()
  advocacyThreat?: boolean;

  @IsOptional()
  @IsBoolean()
  managementParticipationThreat?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveIndependenceCheckDto {
  @IsIn(["SAFEGUARDED", "DECLINED_ENGAGEMENT"])
  resolution!: "SAFEGUARDED" | "DECLINED_ENGAGEMENT";

  @IsString()
  resolutionNotes!: string;
}
