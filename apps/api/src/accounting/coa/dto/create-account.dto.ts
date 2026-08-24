import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const NORMAL_BALANCES = ["DEBIT", "CREDIT"];
const CONTROL_TYPES = ["ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE", "BANK", "CASH", "VAT_OUTPUT", "VAT_INPUT"];

export class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsIn(ACCOUNT_TYPES)
  type!: string;

  @IsOptional()
  @IsString()
  subtype?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsIn(NORMAL_BALANCES)
  normalBalance!: string;

  @IsOptional()
  @IsBoolean()
  isControlAccount?: boolean;

  @IsOptional()
  @IsIn(CONTROL_TYPES)
  controlAccountType?: string;

  @IsOptional()
  @IsBoolean()
  reconciliationRequired?: boolean;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  reconciliationRequired?: boolean;
}
