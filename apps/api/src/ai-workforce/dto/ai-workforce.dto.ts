import { IsIn, IsOptional, IsString } from "class-validator";

const REVIEW_DECISIONS = ["APPROVED", "REJECTED", "OVERRIDDEN"];

// There's deliberately no DTO for the agentType route param - it isn't
// request *body* to validate, and AiWorkforceService.runAgent() already
// rejects an unknown value with the same 400 a class-validator pipe would
// give (see AGENT_SCANS in ai-workforce.agents.ts for the valid set).

export class ReviewFindingDto {
  @IsIn(REVIEW_DECISIONS)
  decision!: "APPROVED" | "REJECTED" | "OVERRIDDEN";

  @IsOptional()
  @IsString()
  notes?: string;
}
