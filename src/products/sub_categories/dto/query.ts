import { IsNumberString, IsOptional, IsString } from "class-validator";

export class CategoryQuery {
  @IsString()
  @IsNumberString()
  @IsOptional()
  categoryId?: string;
}
