import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateComplianceDeadlineDto {
  @IsString()
  title!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
