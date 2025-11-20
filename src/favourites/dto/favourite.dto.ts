import { IsString, IsInt, IsOptional } from "class-validator";

export class CreateFavoriteDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsInt()
  productId: number;
}
