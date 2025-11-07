import { IsString, IsNumber, Min, Max, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CARRER_TYPE } from "src/products/dto/CreateProductDto.dto";

export class CreateDeliveryAddressDto {
  @ApiProperty({
    description: "Career type should be either 'service_point' or 'collection_address'",
    example: CARRER_TYPE.SERVICE_TYPE,
    enum: CARRER_TYPE,
  })
  @IsEnum(CARRER_TYPE, {
    message: "career_type must be either 'service_point' or 'collection_address'",
  })
  carrer_type: CARRER_TYPE;
  @ApiProperty({ example: "221B Baker Street" })
  @IsString()
  address?: string;

  @ApiProperty({ example: "221B" })
  @IsString()
  @IsOptional()
  house_number?: string;

  @ApiProperty({ example: "Apartment 4A", required: false })
  @IsOptional()
  @IsString()
  address_2?: string;

  @ApiProperty({ example: "London" })
  @IsString()
  city?: string;

  @ApiProperty({ example: "GB" })
  @IsString()
  country?: string;

  @ApiProperty({ example: "NW1 6XE" })
  @IsString()
  postal_code?: string;

  @ApiProperty({ example: "Ximera Hrm Ltd." })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiProperty({ example: "England", required: false })
  @IsString()
  country_state?: string;

  @ApiProperty({ example: "England", required: false })
  @IsOptional()
  @IsNumber()
  service_point_id?: number;
}

export class CreateCollectionAddressDto extends CreateDeliveryAddressDto {
  @ApiProperty({ example: "Width", description: "Width" })
  // @IsOptional()
  @IsNumber()
  @Min(1, { message: "Width must be at least 10 CM" })
  @Max(100, { message: "Width must be at least 100 CM" })
  Width: number;
  @ApiProperty({ example: "Width", description: "Width" })
  @IsNumber()
  @Min(1, { message: "Weight must be at least 1 KG" })
  @Max(100, { message: "Weight must be at least 100 KG" })
  Weight: number;
  @ApiProperty({ example: "Length", description: "Length" })
  @IsNumber()
  @Min(1, { message: "Length must be at least 1 CM" })
  @Max(100, { message: "Length must be at least 100 CM" })
  Length: number;
  @ApiProperty({ example: "Length", description: "Length" })
  @IsNumber()
  @Min(1, { message: "Length must be at least 1 CM" })
  @Max(100, { message: "Length must be at least 100 CM" })
  Height: number;
  // Same as CreateDeliveryAddressDto, but you can use @IsOptional() if you want to allow optional fields in an update
}
