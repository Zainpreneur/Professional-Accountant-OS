import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

const TEAM_ROLES = ["PARTNER", "MANAGER", "SENIOR", "STAFF"];
const COMPLETION_ITEM_STATUSES = ["PENDING", "COMPLETE", "NOT_APPLICABLE"];

export class CreateEngagementDto {
  @IsString()
  serviceType!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  materialityAmount?: number;

  @IsOptional()
  @IsString()
  materialityBasis?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}

export class AddTeamMemberDto {
  @IsString()
  userId!: string;

  @IsIn(TEAM_ROLES)
  role!: string;
}

export class UpdateCompletionItemDto {
  @IsIn(COMPLETION_ITEM_STATUSES)
  status!: "PENDING" | "COMPLETE" | "NOT_APPLICABLE";

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConcludeEngagementDto {
  @IsString()
  conclusionText!: string;
}
