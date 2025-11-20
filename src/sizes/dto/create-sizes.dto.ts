// src/sizes/dto/create-size.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateSizeDto {
  @ApiProperty({ example: "XXL", description: "Size name" })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: "64*22 MM", description: "Size description" })
  @IsString()
  @IsNotEmpty()
  description: string;
}
