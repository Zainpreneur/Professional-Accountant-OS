import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class PayrollRunLineDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowances?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;
}

export class CreatePayrollRunDto {
  @IsString()
  periodLabel!: string;

  @IsDateString()
  payDate!: string;

  // Employees to include, with optional allowance/deduction overrides.
  // Omit entirely to include every ACTIVE employee at their base salary.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayrollRunLineDto)
  lines?: PayrollRunLineDto[];
}

export class PostPayrollRunDto {
  @IsString()
  salariesExpenseAccountId!: string;

  @IsString()
  salariesPayableAccountId!: string;

  @IsOptional()
  @IsString()
  deductionsPayableAccountId?: string;
}
