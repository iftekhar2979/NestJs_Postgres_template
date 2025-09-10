import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsPositive,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  Max,
  IsNumberString,
  IsBooleanString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductImage } from './productImage.entity';
import { ProductStatus } from '../enums/status.enum';
import { User } from 'src/user/entities/user.entity';
import { Favorite } from 'src/favourites/entities/favourite.entity';
import { number } from 'joi';
import { ProductBoosts } from 'src/product-boost/entities/product-boost.entity';
import { Offer } from 'src/offers/entities/offer.entity';

@Entity('products')
export class Product {
  @ApiProperty({ example: 1, description: 'Unique identifier for the product' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10, description: 'ID of the user who owns the product' })
  @IsString()
  @Column()
  user_id: string;

  @ApiProperty({ example: 'iPhone 13', description: 'Name of the product' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column()
  product_name: string;
  @ApiProperty({
    type: () => [ProductImage],
    description: 'List of product images related to this product',
    required: false,
  })
  @OneToMany(() => ProductImage, (productImage) => productImage.product, {
    cascade: true,
    eager: true, // Optional: auto-load images with product
  })
  images: ProductImage[];

  @ApiProperty({ example: 'available', description: 'Status of the product (e.g., available, sold)' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Column()
  status: ProductStatus;

  @ApiProperty({ example: 499.99, description: 'Selling price of the product' })
  @IsNumber()
  @IsPositive()
  @Column('decimal', { precision: 10, scale: 2 })
  selling_price: number;

  @ApiProperty({ example: 300.00, description: 'Purchasing price of the product' })
  @IsNumber()
  @IsPositive()
  @Column('decimal', { precision: 10, scale: 2 })
  purchasing_price: number;

  @ApiProperty({ example: 'Electronics', description: 'Category of the product' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Column()
  category: string;

  @ApiProperty({ example: 5, description: 'Quantity of the product in stock' })
  @IsInt()
  @Min(0)
  @Column()
  quantity: number;

  @ApiProperty({ example: 'A gently used iPhone in excellent condition', description: 'Detailed description of the product' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Column('text')
  description: string;

 
  @ApiProperty({ example: 'Used - Like New', description: 'Condition of the product' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Column()
  condition: string;


  @ApiProperty({ example: 'M', description: 'Size of the product (if applicable)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Column()
  size: string;

  @ApiProperty({ example: 'Apple', description: 'Brand of the product' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column()
  brand: string;

  @ApiProperty({ example: true, description: 'Whether the price is negotiable' })
  @IsBoolean()
  @Column({ default: false })
  is_negotiable: boolean;
  @ApiProperty({ example: true, description: 'Whether the price is negotiable' })
  @IsBoolean()
  @Column({ default: false })
  is_boosted: boolean;

     @ApiProperty({ description: 'Boost start time for the product' })
  @Column({ type: 'timestamp', nullable: true })
  boost_start_time: Date;

  @ApiProperty({ description: 'Boost end time for the product' })
  @Column({ type: 'timestamp', nullable: true })
  boost_end_time: Date;

  @ApiProperty({ example: '2025-08-07T12:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({ example: '2025-08-08T15:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
updated_at: Date;

  @ManyToOne(() => User, (user) => user.products, { eager: true })
@JoinColumn({ name: 'user_id' })
user: User; 
@OneToMany(() => Favorite, (favorite) => favorite.product)
favorites: Favorite[];  
@OneToMany(() => ProductBoosts, (favorite) => favorite.product)
boosted: ProductBoosts[];  
@ManyToOne(() => Offer, (offer) => offer.product, { nullable: true })
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;  // The related offer for this product
}

export class FavouriteProduct extends Product {
  @ApiProperty({ example: true, description: 'Is the product marked as favorite by the current user' })
  is_favorite: boolean;
}