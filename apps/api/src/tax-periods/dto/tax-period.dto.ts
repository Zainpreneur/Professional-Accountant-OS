import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const PERIOD_TYPES = ["VAT", "WHT", "ZAKAT"];

export class CreateTaxPeriodDto {
  @IsIn(PERIOD_TYPES)
  periodType!: "VAT" | "WHT" | "ZAKAT";

  @IsString()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  // Optional override for the statutory filing deadline. When omitted, a
  // reasonable default is computed from periodType (see TaxPeriodsService) -
  // an approximation, not authoritative for every registrant category.
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
