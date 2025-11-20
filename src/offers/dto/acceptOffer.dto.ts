import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsUUID } from "class-validator";

export class AcceptDto {
  @ApiProperty({ example: 101, description: "Offer ID" })
  @IsNumber()
  @IsPositive()
  offer_id: number;

  //   @ApiProperty({ example: 250.00, description: 'Seller id' })
  @ApiProperty({ example: "uuid-of-buyer", description: "Buyer user ID (UUID)" })
  @IsUUID()
  buyer_id: string;
}
