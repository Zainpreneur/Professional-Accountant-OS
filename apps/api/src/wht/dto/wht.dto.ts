import { IsDateString, IsNumber, IsString, Min } from "class-validator";

export class CalculateWhtDto {
  @IsString()
  supplierId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  date!: string;
}

export class GenerateWhtReturnDto {
  @IsString()
  taxPeriodId!: string;
}
