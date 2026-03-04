import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator";
import { CARRER_TYPE } from "../CreateProductDto.dto";
import { CollectionAddressDto } from "./CreateProduct.dto";

// ─── Update Variant DTO ───────────────────────────────────────────────────────
// id is optional — provide to update existing, omit to create new.
// Variants NOT sent in this array will be DELETED.

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 7, description: "Variant ID (omit to create new)" })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  colorId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  sizeId?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unit?: number;

  @ApiPropertyOptional({ example: 520.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price_override?: number;

  @ApiPropertyOptional({ example: "BLU-XL-001" })
  @IsOptional()
  @IsString()
  sku?: string;
}

// ─── Update Product DTO ───────────────────────────────────────────────────────

export class UpdateProductDto {
  @ApiPropertyOptional({ example: "iPhone 13 Pro" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  product_name?: string;

  @ApiPropertyOptional({ example: "Updated description here." })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: "Used - Good" })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ example: "Samsung" })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 399.99 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  subCategoryId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_negotiable?: boolean;

  @ApiPropertyOptional({ example: 2.1 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 30.0 })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ example: 25.0 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 10.0 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ enum: CARRER_TYPE })
  @IsOptional()
  @IsEnum(CARRER_TYPE)
  carrer_option?: CARRER_TYPE;

  @ApiPropertyOptional({ type: [UpdateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];

  @ApiPropertyOptional({ type: CollectionAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CollectionAddressDto)
  collectionAddress?: CollectionAddressDto;

  // Populated by interceptor after file upload
  images?: string[];
}