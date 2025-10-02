import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Product } from "./products.entity";
import { IsString, IsUrl, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

@Entity("products_image")
export class ProductImage {
  @ApiProperty({ example: 1, description: "Unique identifier for the product image" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: "ID of the product this image belongs to" })
  @IsNumber()
  @Column()
  product_id: number;

  @ApiProperty({ example: "https://example.com/image.jpg", description: "URL of the product image" })
  @IsString()
  @IsUrl()
  @Column()
  image: string;

  // Relations
  @ApiProperty({ description: "Timestamp when image was added" })
  @CreateDateColumn()
  TimestampSecond: Date;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: "CASCADE",
  })
  product: Product;
}
