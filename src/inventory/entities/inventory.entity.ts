import { ApiProperty } from "@nestjs/swagger";
import { Product } from "src/products/entities/products.entity";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from "typeorm";

@Entity("inventory")
export class Inventory {
  @ApiProperty({ example: 1, description: "Unique ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  product_id: number;

  @ManyToOne(() => Product, (product) => product.inventory, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", nullable: true })
  variant_id: number;

  @OneToOne(() => ProductVariant, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "variant_id" })
  variant: ProductVariant;

  @ApiProperty({ example: 100, description: "Total physical stock" })
  @Column({ type: "int", default: 0 })
  stock: number;

  @ApiProperty({ example: 5, description: "Stock reserved but not yet paid/processed" })
  @Column({ type: "int", default: 0 })
  reserved_stock: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
