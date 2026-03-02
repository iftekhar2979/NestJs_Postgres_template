// src/sizes/dto/create-size.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateSizeDto {
  @ApiProperty({ example: "XXL", description: "Size name" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: "64*22 MM", description: "Size description" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
