import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

export enum PaymentMethod {
  WALLET = "wallet",
  STRIPE = "stripe",
}

export class PurchaseDto {
  @ApiProperty({ example: "1", description: "Product ID" })
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ example: "1", description: "Variant ID (optional)" })
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 1, description: "Quantity to purchase" })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: "wallet", enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}
