import { ApiProperty } from "@nestjs/swagger";
import {
  IsBooleanString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
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
  price: string;

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
  @IsInt()
  size: number;
  @ApiProperty({ description: "color", example: "Midnight blue" })
  @IsInt()
  color: number;

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
}
