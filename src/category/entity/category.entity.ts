// src/category/entities/category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("categories")
export class Category {
  @ApiProperty({ example: 1, description: "Unique ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "Electronics", description: "Category name" })
  @Column()
  name: string;
  @ApiProperty({ example: "Image", description: "Image Url" })
  @Column()
  image: string;
}
