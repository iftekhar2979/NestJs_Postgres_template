import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Order } from "src/orders/entities/order.entity";
import { User } from "src/user/entities/user.entity";

export enum DeliveryStatus {
  PENDING = "pending",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

@Entity("deliveries")
export class Delivery {
  @ApiProperty({ example: 1, description: "Unique ID for the delivery" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 101, description: "Order ID associated with this delivery" })
  @Column()
  order_id: number;
  @ApiProperty({ example: "uuid-of-buyer", description: "User ID of the recipient (buyer)" })
  @Column()
  user_id: string;

  @ApiProperty({ description: "Timestamp when the delivery was created" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ description: "Timestamp when the delivery was last updated" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @OneToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
