import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { Favorite } from "src/favourites/entities/favourite.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { ProductBoosts } from "src/product-boost/entities/product-boost.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CARRER_TYPE } from "../dto/CreateProductDto.dto";
import { ProductStatus } from "../enums/status.enum";
import { Review } from "../reviews/entities/review.entity";
import { SubCategory } from "../sub_categories/entities/sub_categories.entity";
import { ProductVariant } from "../varients/entities/productVarient.entity";
import { ProductImage } from "./productImage.entity";

// \

@Entity("products")
@Index("full_text_index", ["product_name"])
@Index("price", ["price"])
export class Product {
  @ApiProperty({ example: 1, description: "Unique identifier for the product" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "10", description: "ID of the user who owns the product" })
  @IsString()
  @Column()
  user_id: string;

  @ApiProperty({ example: "iPhone 13", description: "Name of the product" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column()
  product_name: string;

  @ApiProperty({
    type: () => [ProductImage],
    description: "List of product images related to this product",
    required: false,
  })
  @OneToMany(() => ProductImage, (productImage) => productImage.product, {
    cascade: true,
    eager: true,
  })
  images: ProductImage[];

  // ─── VARIANTS (replaces top-level colorId / sizeId / unit) ───────────────────
  @ApiProperty({
    type: () => [ProductVariant],
    description: "Color + size + stock variants for this product",
  })
  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
    eager: true,
  })
  variants: ProductVariant[];

  @ApiProperty({ example: "available", description: "Status of the product" })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Column()
  status: ProductStatus;

  @Column({ type: "int" })
  subCategoryId: number;

  @ManyToOne(() => SubCategory, (subCategory) => subCategory.products)
  @JoinColumn({ name: "subCategoryId" })
  subCategory: SubCategory;

  @ApiProperty({ example: 499.99, description: "Base selling price of the product (in default currency)" })
  @IsNumber()
  @IsPositive()
  @Column("decimal", { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({
    example: "A gently used iPhone in excellent condition",
    description: "Detailed description of the product",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Column("text")
  description: string;

  @ApiProperty({ example: "Used - Like New", description: "Condition of the product" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Column()
  condition: string;

  @ApiProperty({ example: "Apple", description: "Brand of the product" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Column()
  brand: string;

  @ApiProperty({ example: true, description: "Whether the price is negotiable" })
  @IsBoolean()
  @Column({ default: false })
  is_negotiable: boolean;

  @ApiProperty({ example: false, description: "Whether the product is currently boosted" })
  @IsBoolean()
  @Column({ default: false })
  is_boosted: boolean;

  @ApiProperty({ description: "Boost start time for the product" })
  @Column({ type: "timestamp", nullable: true })
  boost_start_time: Date;

  @ApiProperty({ description: "Boost end time for the product" })
  @Column({ type: "timestamp", nullable: true })
  boost_end_time: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  @ApiProperty({ example: "2.49" })
  weight: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  @ApiProperty({ example: "31.5" })
  length: number;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "drop_off" })
  carrer_option: CARRER_TYPE;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  @ApiProperty({ example: "27.2" })
  width: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  @ApiProperty({ example: "12.7" })
  height: number;

  @ApiProperty({ example: "2025-08-07T12:00:00Z", description: "Creation timestamp" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ example: "2025-08-08T15:00:00Z", description: "Last update timestamp" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.products, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @OneToMany(() => Favorite, (favorite) => favorite.product)
  favorites: Favorite[];

  @OneToMany(() => Transections, (transection) => transection)
  transections: Transections[];

  @OneToMany(() => ProductBoosts, (boost) => boost.product)
  boosted: ProductBoosts[];

  @ManyToOne(() => Offer, (offer) => offer.product, { nullable: true })
  @JoinColumn({ name: "offer_id" })
  offer: Offer;

  @OneToOne(() => CollectionAddress, (address) => address.product, {
    cascade: true,
    eager: true,
  })
  collectionAddress: CollectionAddress;

  // ─── Virtual / runtime-only fields ───────────────────────────────────────────
  currency?: string;
  buyer_protection?: number;
}
export class FavouriteProduct extends Product {
  @ApiProperty({ example: true, description: "Is the product marked as favorite by the current user" })
  is_favorite: boolean;
}

export const PRODUCT_BOOSTING_COST = 1;
export const DELIVERY_PROTECTION_PERCENTAGE = 10;
export const PRODUCT_BOOSTING_DAYS = 3;
export const DAYS_IN_SECOND = 24 * 60 * 60 * 1000;
