import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PrimaryPaths } from "../enums/primary-path.enum";
import { Transform } from "class-transformer";

export class PreSignedUrlDTO {
  @ApiProperty({ required: true, description: "upload file name" })
  @MaxLength(500)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ required: true, description: "Primary path name of the files", enum: PrimaryPaths })
  @IsEnum(PrimaryPaths, {
    message: `primaryPath must be one of the following values: ${Object.values(PrimaryPaths).join(", ")}`,
  })
  @IsString()
  @IsNotEmpty()
  primaryPath: PrimaryPaths;

  @ApiPropertyOptional({ description: "no of secs for which the s3 url should be live" })
  @Max(900, { message: "URL can be live for maximum 15 mins or 900 secs" })
  @Min(60, { message: "URL must be live for 60 secs" })
  @IsPositive()
  @IsInt()
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => +value)
  expiresIn?: number;
}
