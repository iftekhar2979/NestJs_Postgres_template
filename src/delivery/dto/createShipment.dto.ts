import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsObject, IsOptional, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateShipmentDto {
  @ApiProperty({ example: "Order Id" })
  @IsNumber()
  @IsPositive()
  order_id: number;
  @ApiProperty({ example: "Quote ID" })
  @IsNumber()
  @IsPositive()
  QuoteID: number;
  @ApiProperty({ example: "Quote ID" })
  @IsNumber()
  @IsPositive()
  ServiceID: number;
  @ApiProperty({ example: "SUCCESS", description: "Status of the shipment" })
  @IsString()
  @IsOptional()
  Status?: string;
  @ApiProperty({ example: "TP-0445469", description: "Order reference for the shipment" })
  @IsString({ message: "Order reference must be a string" })
  @IsOptional()
  @MinLength(1, { message: "Order reference must be at least 1 character long" })
  @MaxLength(50, { message: "Order reference must not exceed 50 characters" })
  orderReference?: string;

  @ApiProperty({ example: "[URL STRING]", description: "Tracking URL for the shipment" })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: "Tracking URL must be at least 1 character long" })
  @MaxLength(255, { message: "Tracking URL must not exceed 255 characters" })
  trackingURL?: string;

  @ApiProperty({ description: "Order Invoice for the shipment" })
  @IsObject()
  @IsOptional()
  orderInvoice: {
    TotalNet: number;
    Tax: number;
    TotalGross: number;
  };

  @ApiProperty({ description: "Labels for the shipment" })
  @IsObject()
  @IsOptional()
  labels?: {
    LabelRole: string;
    LabelFormat: string;
    AirWaybillReference: string;
    DownloadURL: string;
  }[];

  @ApiProperty()
  @IsObject()
  @IsOptional()
  documents?: {
    DocumentType: string;
    Format: string;
    DownloadURL: string;
  }[];
}
