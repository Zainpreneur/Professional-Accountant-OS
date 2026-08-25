import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateSupplierDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  // References RegulatoryRule.code for ruleType=WHT_RATE (SRS 28), e.g.
  // "SERVICES", "ROYALTIES". Omit for suppliers with no withholding.
  @IsOptional()
  @IsString()
  whtCategoryCode?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {}
