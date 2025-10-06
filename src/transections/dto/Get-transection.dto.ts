// src/wallets/dto/get-transaction-history.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "aws-sdk/clients/workmail";
import { IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { TransectionType } from "src/transections/enums/transectionTypes";

export class GetTransactionHistoryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Wallet ID" })
  wallet_id?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "User ID" })
  user_id?: string;

  @IsOptional()
  @IsEnum(TransectionType)
  @ApiPropertyOptional({ enum: TransectionType, description: "Type of transaction" })
  transection_type?: TransectionType;

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({ enum: PaymentStatus, description: "Payment status" })
  status?: PaymentStatus;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ default: 1 })
  page?: number;
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ default: 1 })
  role?: UserRole;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ default: 10 })
  limit?: number;
}
