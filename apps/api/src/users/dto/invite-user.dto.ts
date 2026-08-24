import { IsArray, IsEmail, IsOptional, IsString, IsUUID } from "class-validator";

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  // Role names to assign firm-wide (e.g. ["ACCOUNTANT"]). Use
  // POST /clients/:clientId/members to grant a client-scoped role instead.
  @IsArray()
  @IsString({ each: true })
  roleNames!: string[];

  @IsOptional()
  @IsUUID()
  temporaryPassword?: string;
}
