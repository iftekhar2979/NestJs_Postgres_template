// dto/update-product.dto.ts

import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsBooleanString,
  IsArray,
  IsNumberString,
  MinLength,
  MaxLength,
} from "class-validator";

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "Product name", example: "iPhone 13" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  product_name?: string;

  @ApiPropertyOptional({ description: "Selling price", example: "499.99" })
  @IsOptional()
  @IsNumberString()
  @MinLength(1)
  @MaxLength(5)
  selling_price?: string;

  @ApiPropertyOptional({ description: "Quantity", example: "5" })
  @IsOptional()
  @IsNumberString()
  @MinLength(1)
  @MaxLength(2)
  quantity?: string;

  @ApiPropertyOptional({
    description: "Product images (filenames or paths)",
    type: "string",
    isArray: true,
    example: ["uploads/2025/08/08/image1.png"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "Description", example: "A gently used iPhone in excellent condition" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: "Condition", example: "Used - Like New" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  condition?: string;

  @ApiPropertyOptional({ description: "Brand", example: "Apple" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  brand?: string;

  @ApiPropertyOptional({ description: "Is negotiable", example: "true" })
  @IsOptional()
  @IsBooleanString()
  is_negotiable?: string;

  @ApiPropertyOptional({ description: "Size", example: "Medium" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  size?: string;

  @ApiPropertyOptional({ description: "Category", example: "Electronics" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  category?: string;
}
