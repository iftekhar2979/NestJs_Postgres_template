import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Order } from "src/orders/entities/order.entity";
import { OfferStatus } from "../enums/offerStatus.enum";
import { User } from "src/user/entities/user.entity";
import { Product } from "src/products/entities/products.entity";
import { Messages } from "src/messages/entities/messages.entity";

@Entity("offers")
export class Offer {
  @ApiProperty({ example: 1, description: "Unique ID of the offer" })
  @PrimaryGeneratedColumn()
  id: number;
  @ApiProperty({ example: "uuid-of-seller", description: "Seller user ID" })
  @Column()
  seller_id: string;
  @ApiProperty({ example: "uuid-of-buyer", description: "Buyer user ID" })
  @Column()
  buyer_id: string;

  @Column({ nullable: true })
  order_id: number;
  @ApiProperty({ example: 12, description: "Product ID being purchased" })
  @Column()
  product_id: number;
  // 👤 Buyer relation (optional)
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  // 👤 Seller relation (optional)
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @ApiProperty({ example: 123, description: "Associated order entity" })
  @OneToOne(() => Order, (order) => order.accepted_offer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" }) // Optional: ensures FK column is named `order_id`
  order: Order;
  @ApiProperty({ example: 123, description: "Associated order entity" })
  @ManyToOne(() => Product, (product) => product.id, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" }) // Optional: ensures FK column is named `order_id`
  product: Product;

  @ApiProperty({ example: 99.99, description: "Offered price" })
  @Column("decimal", { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ example: "pending", description: "Status of the offer (e.g., pending, accepted, rejected)" })
  @Column({ default: "pending" })
  status: OfferStatus;
  @OneToMany(() => Messages, (message) => message.offer)
  messages: Messages[];

  @ApiProperty({ description: "Timestamp when the offer was created" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ description: "Timestamp when the offer was last updated" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @OneToMany(() => Product, (product) => product.offer)
  products: Product[];
}
