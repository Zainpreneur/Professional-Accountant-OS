import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateFixedAssetDto {
  @IsString()
  assetCode!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  acquisitionDate!: string;

  @IsNumber()
  @Min(0.01)
  acquisitionCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsInt()
  @Min(1)
  usefulLifeMonths!: number;

  @IsString()
  assetAccountId!: string;

  @IsString()
  depreciationExpenseAccountId!: string;

  @IsString()
  accumulatedDepreciationAccountId!: string;

  // Account credited for the acquisition cost - typically bank/cash, or an
  // Accounts Payable control account if the asset was purchased on credit.
  @IsString()
  fundingAccountId!: string;
}

export class RunDepreciationDto {
  @IsString()
  periodLabel!: string;

  @IsDateString()
  runDate!: string;
}

export class DisposeFixedAssetDto {
  @IsDateString()
  disposalDate!: string;

  @IsNumber()
  @Min(0)
  disposalProceeds!: number;

  @IsString()
  cashAccountId!: string;

  @IsOptional()
  @IsString()
  gainLossAccountId?: string;
}
