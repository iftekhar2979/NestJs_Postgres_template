import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class CheckoutPreviewDto {
  @ApiProperty({ example: 1, description: "Product ID" })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ example: 2, description: "Variant ID (Optional)", required: false })
  @IsInt()
  @IsOptional()
  variantId?: number;

  @ApiProperty({ example: 3, description: "Quantity" })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: "USD", description: "Target currency (Optional)", required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}
