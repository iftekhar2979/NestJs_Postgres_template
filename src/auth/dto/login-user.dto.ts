import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginUserDto {
  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  /**
   * Password of user
   */
  @ApiProperty({ required: true, description: "Password of user" })
  @IsNotEmpty()
  password: string;
}
