import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsNumberString,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator";
import { CARRER_TYPE } from "../CreateProductDto.dto";

// ─── Variant DTO ──────────────────────────────────────────────────────────────

export class CreateVariantDto {
  @ApiProperty({ example: 1, description: "Color ID" })
  @IsInt()
  colorId: number;

  @ApiProperty({ example: 2, description: "Size ID" })
  @IsInt()
  sizeId: number;

  @ApiProperty({ example: 10, description: "Stock qty for this color+size" })
  @IsInt()
  @Min(0)
  unit: number;

  @ApiPropertyOptional({ example: 520.0, description: "Price override (null = use base price)" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price_override?: number;

  @ApiPropertyOptional({ example: "BLU-XL-001" })
  @IsOptional()
  @IsString()
  sku?: string;
}

// ─── Collection Address DTO ───────────────────────────────────────────────────

export class CollectionAddressDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "john@example.com" })
  @IsString()
  email: string;

  @ApiProperty({ example: "+447700900000" })
  @IsString()
  telephone: string;

  @ApiPropertyOptional({ example: "123 Main St" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "London" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "SW1A 1AA" })
  @IsOptional()
  @IsString()
  postcode?: string;
}

// ─── Create Product DTO ───────────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({ example: "iPhone 13 Pro Max" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  product_name: string;

  @ApiProperty({ example: "A gently used iPhone in excellent condition." })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ example: "Used - Like New" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  condition: string;

  @ApiProperty({ example: "Apple" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brand: string;

  @ApiProperty({ example: 499.99, description: "Base price in user's currency" })
  @IsNumberString()
  price: string;

  @ApiProperty({ example: 5, description: "Sub-category ID" })
  @IsNumberString()
  subCategoryId: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_negotiable?: boolean;

  @ApiPropertyOptional({ example: false, description: "Boost product on listing (costs GBP from wallet)" })
  @IsOptional()
  @IsBoolean()
  is_boosted?: boolean;

  @ApiPropertyOptional({ example: 2.49, description: "Weight in KG" })
  @IsOptional()
  @IsNumberString()
  weight?: string;

  @ApiPropertyOptional({ example: 31.5 })
  @IsOptional()
  @IsNumberString()
  length?: string;

  @ApiPropertyOptional({ example: 27.2 })
  @IsOptional()
  @IsNumberString()
  width?: string;

  @ApiPropertyOptional({ example: 12.7 })
  @IsOptional()
  @IsNumberString()
  height?: string;

  @ApiPropertyOptional({ enum: CARRER_TYPE, example: CARRER_TYPE.SERVICE_TYPE })
  @IsOptional()
  @IsEnum(CARRER_TYPE)
  carrer_option?: CARRER_TYPE;

  @ApiPropertyOptional({ type: [CollectionAddressDto] })
  @IsOptional()
  @ValidateNested()
  @Type(() => CollectionAddressDto)
  collectionAddress?: CollectionAddressDto;

  @ApiProperty({
    type: [CreateVariantDto],
    description: "At least one color+size+unit variant required",
    example: [
      { colorId: 1, sizeId: 2, unit: 10 },
      { colorId: 1, sizeId: 3, unit: 5, price_override: 520.0 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  // Populated by interceptor after file upload — not from client body
  images?: string[];
}