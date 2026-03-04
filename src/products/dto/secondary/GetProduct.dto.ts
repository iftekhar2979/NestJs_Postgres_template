import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ProductStatus } from "src/products/enums/status.enum";

export class GetProductsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: "iPhone", description: "Search by name, brand or description" })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({ example: "Apple", description: "Filter by brand" })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: "United Kingdom", description: "Filter by seller country/address" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: "3", description: "Filter by sub-category ID" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subCategoryId?: number;

  @ApiPropertyOptional({ example: "1,2,3", description: "Comma-separated size IDs" })
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional({ example: "1,2", description: "Comma-separated color IDs" })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({ example: "100-500", description: "Price range min-max" })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({ enum: ProductStatus, description: "Filter by status (admin only)" })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // Injected by controller — never from client
  userId?: string;
  userCurrency?: string;
}

export class GetAdminProductsQueryDto extends GetProductsQueryDto {
  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsString()
  sellerEmail?: string;
}