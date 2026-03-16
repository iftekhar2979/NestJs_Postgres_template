import { ApiProperty } from "@nestjs/swagger";
import { Product } from "src/products/entities/products.entity";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Order } from "./order.entity";

@Entity("order_items")
export class OrderItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  order_id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "int" })
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", nullable: true })
  variant_id: number;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: "variant_id" })
  variant: ProductVariant;

  @ApiProperty({ example: 2 })
  @Column({ type: "int" })
  quantity: number;

  @ApiProperty({ example: 49.99 })
  @Column({ type: "decimal", precision: 10, scale: 2 })
  unit_price: number;

  @ApiProperty({ example: 99.98 })
  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_price: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
