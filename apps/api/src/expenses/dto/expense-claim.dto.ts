import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsString, Min, ValidateNested } from "class-validator";

export class ExpenseClaimLineDto {
  @IsString()
  description!: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  categoryAccountId!: string;
}

export class CreateExpenseClaimDto {
  @IsString()
  employeeId!: string;

  @IsString()
  claimNumber!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseClaimLineDto)
  lines!: ExpenseClaimLineDto[];
}

export class PostExpenseClaimDto {
  @IsString()
  paymentAccountId!: string;
}
