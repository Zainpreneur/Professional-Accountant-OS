import { IsEmail, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCustomerDto {
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

  @IsOptional()
  @IsNumber()
  creditLimit?: number;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
