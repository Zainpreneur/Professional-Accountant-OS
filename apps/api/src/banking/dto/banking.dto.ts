import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class MatchLineDto {
  @IsString()
  statementLineId!: string;

  @IsString()
  journalLineId!: string;
}

export class UnmatchLineDto {
  @IsString()
  statementLineId!: string;
}

export class AutoMatchDto {
  @IsString()
  bankAccountId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dateWindowDays?: number;
}

export class CreateTransactionFromLineDto {
  @IsString()
  description!: string;

  @IsString()
  offsetAccountId!: string;
}

export class CreateReconciliationDto {
  @IsString()
  bankAccountId!: string;

  @IsDateString()
  statementDate!: string;

  @IsNumber()
  statementEndingBalance!: number;
}
