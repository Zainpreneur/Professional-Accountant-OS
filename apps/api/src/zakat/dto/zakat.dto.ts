import { IsIn, IsNumber, IsString } from "class-validator";

export class CreateZakatReturnDto {
  @IsString()
  taxPeriodId!: string;
}

export class AddZakatAdjustmentDto {
  @IsString()
  description!: string;

  @IsIn(["ADDITION", "DEDUCTION"])
  type!: "ADDITION" | "DEDUCTION";

  @IsNumber()
  amount!: number;
}

export class FileZakatReturnDto {
  @IsString()
  expenseAccountId!: string;

  @IsString()
  payableAccountId!: string;
}
