import { IsString, IsUUID, IsNumber, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OfferDto {
  @ApiProperty({ example: 101, description: "Product ID" })
  @IsNumber()
  @IsPositive()
  product_id: number;

  @ApiProperty({ example: 250.0, description: "Price for the order" })
  @IsNumber()
  @IsPositive()
  price: number;
}
export class SendOfferDto extends OfferDto {
  @ApiProperty({ example: "uuid-of-buyer", description: "Buyer user ID (UUID)" })
  @IsUUID()
  buyer_id: string;
}
