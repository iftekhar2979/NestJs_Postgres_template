import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { User } from 'src/user/entities/user.entity';

export class CreateReviewDto {
  @ApiProperty({ example: 'user-id-123', description: 'ID of the user who owns the product' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: 'reviewer-id-456', description: 'ID of the user who writes the review' })
  @IsString({message:"Reviewer Id"})
  @IsOptional()
  reviewer_id ?: string;
@ApiProperty({ example: 'reviewer-id-456', description: 'ID of the user who writes the review' })
  @IsString()
  @IsOptional()
  reviewer ?: Partial<User>;
  @ApiProperty({ example: 'A gently used iPhone in excellent condition', description: 'Detailed description of the product' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  review_msg: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}


export class UpdateReviewDto extends PartialType(CreateReviewDto) {}