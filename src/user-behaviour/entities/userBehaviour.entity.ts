// import { Entity } from "typeorm";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { IsString, IsOptional, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "src/user/entities/user.entity";
@Entity("userBehaviours")
export class UserBehaviours {
  @ApiProperty({ example: 1, description: "Unique identifier for the product" })
  @PrimaryGeneratedColumn()
  id: number;
  @ManyToOne(() => User, (user) => user.behaviours, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;
  @ApiProperty({ example: "iPhone 13", description: "Name of the product" })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  @Column("varchar", { nullable: true })
  search: string;
  @ApiProperty({ example: "Electronics", description: "Category of the product" })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  @Column("varchar", { nullable: true })
  category: string;
  @ApiProperty({ example: "Used - Like New", description: "Condition of the product" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Column("varchar", { nullable: true })
  condition: string;

  @ApiProperty({ example: "Apple", description: "Brand of the product" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column("varchar", { nullable: true })
  brand: string;
  @ApiProperty({ example: "Apple", description: "Brand of the product" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column("varchar", { nullable: true })
  price: string;

  @ApiProperty({ example: "2025-08-07T12:00:00Z", description: "Creation timestamp" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ example: "2025-08-08T15:00:00Z", description: "Last update timestamp" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
