import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

const RULE_TYPES = ["VAT_RATE", "WHT_RATE", "ZAKAT_RATE"];

export class CreateRegulatoryRuleDto {
  @IsString()
  jurisdiction!: string;

  @IsString()
  authority!: string;

  @IsIn(RULE_TYPES)
  ruleType!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
