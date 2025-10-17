// dto/get-products-query.dto.ts

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumberString } from "class-validator";
import { User } from "src/user/entities/user.entity";
import { ProductStatus } from "../enums/status.enum";

export class GetProductsQueryDto {
  @ApiPropertyOptional({ description: "Search term (e.g., product name, brand)", example: "iphone" })
  @IsOptional()
  @IsString()
  term?: string;
  @ApiPropertyOptional({ description: "Search term (e.g., product name, brand)", example: "iphone" })
  @IsOptional()
  @IsString()
  status?: ProductStatus;

  @ApiPropertyOptional({ description: "Size filter (comma-separated)", example: "small,medium" })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: "Product category", example: "Phone" })
  @IsOptional()
  @IsString()
  category?: string;
  @ApiPropertyOptional({ description: "Product category", example: "Phone" })
  @IsOptional()
  @IsString()
  country?: string;
  @ApiPropertyOptional({ description: "My post and others post", example: "own" })
  @IsString()
  type: "own" | "global";
  @ApiPropertyOptional({ description: "User UUid", example: "UUID" })
  @IsOptional()
  @IsString()
  userId?: string;
  @ApiPropertyOptional({ description: "User UUid", example: "UUID" })
  user?: User;

  @ApiPropertyOptional({ description: "Price range in format min-max", example: "100-300" })
  @IsOptional()
  // @Matches(/^\d+-\d+$/, {
  //   message: 'Price must be in format "min-max", e.g., "10-50"',
  // })
  price?: string;

  @ApiPropertyOptional({ description: "Page number for pagination", example: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: "Limit number of products per page", example: 10 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class GetAdminProductQuery {
  @ApiPropertyOptional({ description: "Search term (e.g., product name, brand)", example: "iphone" })
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional({ description: "Search term (e.g., product name, brand)", example: "iphone" })
  @IsOptional()
  @IsString()
  status?: ProductStatus;

  @ApiPropertyOptional({ description: "Size filter (comma-separated)", example: "small,medium" })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: "Product category", example: "Phone" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "User UUid", example: "UUID" })
  @IsOptional()
  @IsString()
  userId?: string;
  @ApiPropertyOptional({ description: "User UUid", example: "UUID" })
  user?: User;

  @ApiPropertyOptional({ description: "Price range in format min-max", example: "100-300" })
  @IsOptional()
  // @Matches(/^\d+-\d+$/, {
  //   message: 'Price must be in format "min-max", e.g., "10-50"',
  // })
  price?: string;

  @ApiPropertyOptional({ description: "Page number for pagination", example: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: "Limit number of products per page", example: 10 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
