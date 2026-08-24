import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterFirmDto {
  @IsString()
  @MinLength(2)
  firmName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;
}
