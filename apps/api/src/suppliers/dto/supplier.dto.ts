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
}

export class UpdateSupplierDto extends CreateSupplierDto {}
