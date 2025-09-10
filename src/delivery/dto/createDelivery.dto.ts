import { Length } from 'class-validator';
import { IsString, IsEmail, IsNumber, Min, Max, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryAddressDto {


  @ApiProperty({ example: 'Company Inc.', description: 'Company Name' })
  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Company name must be less than or equal to 100 characters' })
  companyName: string;

  @ApiProperty({ example: '123 Main St', description: 'Address Line One' })
  @IsString()
  @MinLength(5, { message: 'Address Line One must be at least 5 characters long' })
  @MaxLength(200, { message: 'Address Line One must be less than or equal to 200 characters' })
  addressLineOne: string;

  @ApiProperty({ example: 'City', description: 'City' })
  @IsString()
  @MinLength(2, { message: 'City name must be at least 2 characters long' })
  @MaxLength(100, { message: 'City name must be less than or equal to 100 characters' })
  city: string;

  @ApiProperty({ example: '12345', description: 'Postcode' })
  @IsString()
  @MinLength(3, { message: 'Postcode must be at least 5 characters long' })
  @MaxLength(10, { message: 'Postcode must be less than or equal to 10 characters' })
  postcode: string;

  @ApiProperty({ example: '1234567890', description: 'Telephone Number' })
  @IsString()
  @MinLength(10, { message: 'Telephone number must be at least 10 characters long' })
  @MaxLength(20, { message: 'Telephone number must be less than or equal to 15 characters' })
  telephoneNumber: string;

  @ApiProperty({ example: 112, description: 'County Id' })
  @IsNumber()
  @Min(1, { message: 'Country ID must be greater than or equal to 1' })
  @Max(300, { message: 'Country ID must be less than or equal to 300' })
  country_id: number;

  @ApiProperty({ example: 'US', description: 'County Code' })
  @IsString()
  @MinLength(2, { message: 'Country code must be at least 2 characters long' })
  @MaxLength(3, { message: 'Country code must be less than or equal to 3 characters' })
  country_code: string;

  @ApiProperty({ example: 'Bangladesh', description: 'Country' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Country name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Country name must be less than or equal to 100 characters' })
  country: string;


}

export class CreateCollectionAddressDto extends CreateDeliveryAddressDto {

  @ApiProperty({ example: 'Width', description: 'Width' })
  // @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Width must be at least 10 CM' })
  @Max(100, { message: 'Width must be at least 100 CM' })
  Width : number;
  @ApiProperty({ example: 'Width', description: 'Width' })
  @IsNumber()
  @Min(1, { message: 'Weight must be at least 1 KG' })
  @Max(100, { message: 'Weight must be at least 100 KG' })
  Weight : number;
  @ApiProperty({ example: 'Length', description: 'Length' })
  @IsNumber()
  @Min(1, { message: 'Length must be at least 1 CM' })
  @Max(100, { message: 'Length must be at least 100 CM' })
  Length : number;
  @ApiProperty({ example: 'Length', description: 'Length' })
  @IsNumber()
  @Min(1, { message: 'Length must be at least 1 CM' })
  @Max(100, { message: 'Length must be at least 100 CM' })
  Height : number;
  // Same as CreateDeliveryAddressDto, but you can use @IsOptional() if you want to allow optional fields in an update
}
