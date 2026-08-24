import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsString()
  inventoryAccountId!: string;

  @IsString()
  cogsAccountId!: string;
}

export class CreateWarehouseDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}

export class StockReceiptDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsString()
  fundingAccountId!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class StockIssueDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class StockAdjustmentDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsDateString()
  date!: string;

  // Positive = stock found/increased, negative = stock written off/shrinkage.
  @IsNumber()
  quantityDelta!: number;

  // Required and used only when quantityDelta > 0 (there is no "current
  // average cost" to fall back on until stock exists at that cost layer).
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsString()
  adjustmentAccountId!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
