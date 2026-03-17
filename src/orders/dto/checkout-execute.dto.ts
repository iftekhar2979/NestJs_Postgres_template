import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { PaymentMethod } from "src/purchase/dto/purchase.dto";
import { CreateUserAddressDto } from "src/user/dto/create-user-address.dto";

export class CheckoutExecuteDto {
  @ApiProperty({ example: "uuid-v4-session-id" })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ example: "uuid-v4-address-id", required: false })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiProperty({ type: CreateUserAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserAddressDto)
  newAddress?: CreateUserAddressDto;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.WALLET })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod: PaymentMethod = PaymentMethod.WALLET;
}
