import { IsString } from "class-validator";

export class GenerateVatReturnDto {
  @IsString()
  taxPeriodId!: string;
}

export class FileVatReturnDto {
  // The account this period's net VAT position settles into - a liability
  // account when netVatDue > 0 (payable to ZATCA), or an asset/receivable
  // account when netVatDue < 0 (refundable). Chosen at filing time, same
  // pattern as every other "settle at posting time" account in this app.
  @IsString()
  payableAccountId!: string;
}
