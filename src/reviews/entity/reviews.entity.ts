import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('reviews')
export class Reviews {
  @ApiProperty({ example: 1, description: 'Unique identifier for the product' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10, description: 'ID of the user who owns the product' })
  @IsString()
  @Column()
  user_id: string;
  @ApiProperty({ example: 10, description: 'Reviewer of the reviews' })
  @IsString()
  @Column()
  reviewer_id: string;

  @ApiProperty({ example: 'A gently used iPhone in excellent condition', description: 'Detailed description of the product' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Column('text')
  review_msg: string;
  @ApiProperty({ example: 5, description: 'Rating' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Column()
  rating: number;

  @ManyToOne(() => User, (user) => user.reviews,)
@JoinColumn({ name: 'user_id' })
user: User; 
@ManyToOne(() => User, (user) => user.reviews,)
@JoinColumn({ name: 'user_id' })
reviewer: User; 

}
