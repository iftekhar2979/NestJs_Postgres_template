import { IsString, IsEmail, IsNumber, Min, Max, IsOptional, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCollectionAddressDto {
  @ApiProperty({ example: "Jane", description: "Forename" })
  @IsString()
  @MinLength(2, { message: "Forename must be at least 2 characters long" })
  @MaxLength(50, { message: "Forename must be less than or equal to 50 characters" })
  forename: string;

  @ApiProperty({ example: "Smith", description: "Surname" })
  @IsString()
  @MinLength(2, { message: "Surname must be at least 2 characters long" })
  @MaxLength(50, { message: "Surname must be less than or equal to 50 characters" })
  surname: string;

  @ApiProperty({ example: "jane.smith@example.com", description: "Email Address" })
  @IsEmail()
  emailAddress: string;

  @ApiProperty({ example: "Company Ltd.", description: "Company Name" })
  @IsString()
  @MinLength(2, { message: "Company name must be at least 2 characters long" })
  @MaxLength(100, { message: "Company name must be less than or equal to 100 characters" })
  companyName: string;

  @ApiProperty({ example: "456 Another St", description: "Address Line One" })
  @IsString()
  @MinLength(5, { message: "Address Line One must be at least 5 characters long" })
  @MaxLength(200, { message: "Address Line One must be less than or equal to 200 characters" })
  addressLineOne: string;

  @ApiProperty({ example: "Town", description: "City" })
  @IsString()
  @MinLength(2, { message: "City name must be at least 2 characters long" })
  @MaxLength(100, { message: "City name must be less than or equal to 100 characters" })
  city: string;

  @ApiProperty({ example: "67890", description: "Postcode" })
  @IsString()
  @MinLength(5, { message: "Postcode must be at least 5 characters long" })
  @MaxLength(10, { message: "Postcode must be less than or equal to 10 characters" })
  postcode: string;

  @ApiProperty({ example: "0987654321", description: "Telephone Number" })
  @IsString()
  @MinLength(10, { message: "Telephone number must be at least 10 characters long" })
  @MaxLength(15, { message: "Telephone number must be less than or equal to 15 characters" })
  telephoneNumber: string;

  @ApiProperty({ example: 112, description: "County Id" })
  @IsNumber()
  @Min(1, { message: "Country ID must be greater than or equal to 1" })
  @Max(4, { message: "Country ID must be less than or equal to 4" })
  country_id: number;

  @ApiProperty({ example: "US", description: "County Code" })
  @IsString()
  @MinLength(2, { message: "Country code must be at least 2 characters long" })
  @MaxLength(3, { message: "Country code must be less than or equal to 3 characters" })
  country_code: string;

  @ApiProperty({ example: "Bangladesh", description: "Country" })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Country name must be at least 3 characters long" })
  @MaxLength(100, { message: "Country name must be less than or equal to 100 characters" })
  country: string;

  @ApiProperty({ example: 1, description: "Order ID" })
  @IsNumber()
  @Min(1, { message: "Order ID must be greater than or equal to 1" })
  order_id: number;
}

export class UpdateCollectionAddressDto extends CreateCollectionAddressDto {
  // Same as CreateCollectionAddressDto, but with @IsOptional() where needed for updating specific fields
}
