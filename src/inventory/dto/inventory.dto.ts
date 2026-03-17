import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, Min } from "class-validator";

export class CreateInventoryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock: number;
}

export class UpdateInventoryDto {
  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  stock: number;
}

export class ReserveStockDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class ConfirmStockDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class ReleaseStockDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}
