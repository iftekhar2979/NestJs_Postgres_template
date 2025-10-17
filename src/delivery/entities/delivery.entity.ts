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
import { Service } from "src/transglobal/entity/courier_details.entity";
import { Shipment } from "./shipments.entity";

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
  @ApiProperty({ example: "pending", enum: DeliveryStatus, description: "Current status of the delivery" })
  @Column({ type: "enum", enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;
  @Column("int", { nullable: true })
  transgloal_id: number;
  @ManyToOne(() => Service, (service) => service.id, { nullable: true })
  @JoinColumn({ name: "transglobal_id" })
  service: Service;
  @Column("int", { nullable: true })
  shipment_id: number;
  @ManyToOne(() => Shipment, (shipment) => shipment.id, { nullable: true })
  @JoinColumn({ name: "shipment_id" })
  shipment: Shipment;
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
