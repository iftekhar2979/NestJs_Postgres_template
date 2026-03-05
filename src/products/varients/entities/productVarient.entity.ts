import { ApiProperty } from "@nestjs/swagger";
import { ProductColor } from "src/products/colors/entities/colors.entity";
import { Product } from "src/products/entities/products.entity";
import { Size } from "src/sizes/entity/sizes.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
@Entity("product_variants")
@Index(["product_id", "colorId", "sizeId"])
@Index( ["product_id"])
@Index( ["updated_at"]) // For tracking changes
export class ProductVariant {
  @ApiProperty({ example: 1, description: "Unique identifier for the variant" })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  product_id: number;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int" })
  colorId: number;

  @ManyToOne(() => ProductColor, (color) => color.variants)
  @JoinColumn({ name: "colorId" })
  color: ProductColor;

  @Column({ type: "int" })
  sizeId: number;

  @ManyToOne(() => Size, (size) => size.variants)
  @JoinColumn({ name: "sizeId" })
  size: Size;

  @ApiProperty({ example: 10, description: "Stock quantity for this color+size combination" })
  @Column({ type: "int", default: 0 })
  unit: number;

  @ApiProperty({ example: "XL-Red-SKU-001", description: "Optional SKU for this variant" })
  @Column({ type: "varchar", nullable: true })
  sku: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}