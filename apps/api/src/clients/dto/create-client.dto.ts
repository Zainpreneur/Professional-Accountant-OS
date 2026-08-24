import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  legalName!: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  businessCategory?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  taxRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;
}

export class UpdateClientDto extends CreateClientDto {
  @IsOptional()
  @IsIn(["ONBOARDING", "ACTIVE", "SUSPENDED", "OFFBOARDED"])
  status?: string;
}
