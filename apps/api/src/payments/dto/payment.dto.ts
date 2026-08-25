import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class PaymentAllocationDto {
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  billId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePaymentDto {
  @IsIn(["RECEIPT", "PAYMENT"])
  type!: "RECEIPT" | "PAYMENT";

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  bankAccountId!: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  // Withholding tax (SRS 28), PAYMENT only: withheld from what's actually
  // wired to the supplier. Allocations still settle the full (gross) bill
  // amount - only the bank movement is reduced by whtAmount, with the
  // difference credited to whtPayableAccountId. Use
  // GET .../wht/calculate to compute this from the supplier's WHT category
  // via the regulatory rules engine before submitting.
  @IsOptional()
  @IsNumber()
  @Min(0)
  whtAmount?: number;

  @IsOptional()
  @IsString()
  whtPayableAccountId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}
