import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumberString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBooleanString,
  IsEnum,
} from "class-validator";

export enum CARRER_TYPE {
  SERVICE_TYPE = "service_point",
  COLLECTION_TYPE = "collection_address",
}
export class CreateProductDto {
  @ApiProperty({ description: "Product name", example: "iPhone 13" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  product_name: string;

  @ApiProperty({ description: "Selling price", example: "499.99" })
  @IsNumberString()
  selling_price: string;

  @ApiProperty({ description: "Quantity", example: "5" })
  @IsNumberString()
  quantity: string;

  @ApiProperty({ description: "Description", example: "A gently used iPhone in excellent condition" })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: "Product images",
    type: "string",
    format: "binary",
    isArray: true,
    required: false,
  })
  @IsOptional()
  images?: any;

  @ApiProperty({ description: "Condition", example: "Used - Like New" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  condition: string;

  @ApiProperty({ description: "Brand", example: "Apple" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brand: string;

  @ApiProperty({ description: "Is negotiable (true or false)", example: "true" })
  @IsBooleanString()
  is_negotiable: string;

  @ApiProperty({ description: "Is Boosted (true or false)", example: "true" })
  @IsBooleanString()
  is_boosted: string;

  @ApiProperty({ description: "Size", example: "Medium" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  size: string;

  @ApiProperty({ description: "Category", example: "Electronics" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  category: string;

  @ApiProperty({ description: "Product weight (in kg or lbs)", example: "2.49" })
  @IsNumberString()
  weight: string;

  @ApiProperty({ description: "Product length (in cm or inches)", example: "31.5" })
  @IsNumberString()
  length: string;

  @ApiProperty({ description: "Product width (in cm or inches)", example: "27.2" })
  @IsNumberString()
  width: string;

  @ApiProperty({ description: "Product height (in cm or inches)", example: "12.7" })
  @IsNumberString()
  height: string;
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
  @IsOptional()
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
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: "GB" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: "NW1 6XE" })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({ example: "Ximera Hrm Ltd." })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiProperty({ example: "England", required: false })
  @IsOptional()
  @IsString()
  country_state?: string;

  @ApiProperty({ example: "England", required: false })
  @IsOptional()
  @IsNumberString()
  service_point_id?: string;
}
