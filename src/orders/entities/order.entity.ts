// order.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Product } from "src/products/entities/products.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { User } from "src/user/entities/user.entity";
import { OrderStatus, PaymentStatus } from "../enums/orderStatus";
import { IsInt, Min } from "class-validator";
import { Transections } from "src/transections/entity/transections.entity";
import { DeliveryAddress } from "src/delivery/entities/delivery_information.entity";

@Entity("orders")
export class Order {
  @ApiProperty({ example: 1, description: "Unique ID for the order" })
  @PrimaryGeneratedColumn()
  id: number;

  // 👤 Seller relation
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @ApiProperty({ example: "uuid-of-seller", description: "Seller user ID" })
  @Column()
  seller_id: string;

  // 👤 Buyer relation
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @ApiProperty({ example: "uuid-of-buyer", description: "Buyer user ID" })
  @Column()
  buyer_id: string;

  // 📦 Product relation
  @OneToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;
  // 💬 Accepted Offer
  @OneToOne(() => Offer, (offer) => offer.order, { cascade: true, nullable: true })
  @JoinColumn({ name: "offer_id" })
  accepted_offer: Offer;

  @ApiProperty({ example: 123, description: "Accepted Offer ID" })
  @Column("int", { nullable: true })
  offer_id: number;
  @ApiProperty({ example: 5, description: "Quantity of the product in stock" })
  @IsInt()
  @Min(0)
  @Column("decimal")
  protectionFee: number;
  @ApiProperty({ example: 5, description: "Delivery Protection Fee" })
  @IsInt()
  @Min(0)
  @Column("decimal", { default: 0 })
  deliveryProtectionFee: number;
  @ApiProperty({ example: 5, description: "Total Amount" })
  @IsInt()
  @Min(0)
  @Column("decimal")
  total: number;
  @ApiProperty({ example: 5, description: "Delivery Charge" })
  @IsInt()
  @Min(0)
  @Column("decimal", { nullable: true })
  deliveryCharge: number;

  @ApiProperty({ description: "Send Cloud Parcel Id " })
  @Column("int", { nullable: true })
  parcel_id: number;
  // 🚚 Delivery
  @OneToOne(() => DeliveryAddress, (delivery) => delivery.order, {
    cascade: true,
  })
  deliveryInfo: DeliveryAddress;

  @ApiProperty({ example: "uuid-of-delivery", description: "Delivery ID" })
  @Column({ nullable: true })
  delivery_id: number;

  // 📦 Order status
  @ApiProperty({ example: "pending", description: "Status of the order (pending, confirmed, etc.)" })
  @Column({ default: OrderStatus.PENDING })
  status: OrderStatus;

  // 💳 Payment status
  @ApiProperty({ example: "pending", description: "Payment status" })
  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @OneToMany(() => Transections, (transection) => transection)
  transections: Transections[];

  // ⏱️ Timestamps
  @ApiProperty({ description: "Created at" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ description: "Updated at" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
