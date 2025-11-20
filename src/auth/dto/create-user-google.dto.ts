import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUserGoogleDto {
  /**
   * GoogleID of user
   */
  @ApiProperty({ required: true, description: "GoogleID of user" })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  /**
   * Firstname of user
   */
  @ApiPropertyOptional({ description: "Firstname of user" })
  @IsString()
  @IsOptional()
  firstName?: string;

  /**
   * Lastname of user
   */
  @ApiProperty({ required: true, description: "Lastname of user" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsEmail()
  @IsString({ message: "Email can not be only numbers" })
  @IsNotEmpty()
  email: string;
}
