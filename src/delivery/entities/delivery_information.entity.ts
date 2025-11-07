import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from "typeorm";

import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { Order } from "src/orders/entities/order.entity";

@Entity("delivery_address")
export class DeliveryAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { nullable: true })
  name?: string;

  @Column("varchar", { nullable: true })
  company_name?: string;

  @Column("varchar", { nullable: true })
  email?: string;

  @Column("varchar", { nullable: true })
  telephone?: string;

  @Column("varchar", { nullable: true })
  address?: string;

  @Column("varchar", { nullable: true })
  house_number?: string;

  @Column("varchar", { nullable: true })
  address_2?: string;

  @Column("varchar", { nullable: true })
  city?: string;

  @Column({ type: "int", nullable: true })
  @ApiProperty({ example: "315" })
  service_point_id?: number;

  @ApiProperty({ example: "Bangladesh", description: "County" })
  @IsString()
  @Column("varchar", { nullable: true })
  country?: string;
  @ApiProperty({ example: "", description: "Postal code" })
  @IsString()
  @Column("varchar", { nullable: true })
  postal_code?: string;

  @OneToOne(() => Order, (order) => order)
  @JoinColumn({ name: "order_id" })
  order: Order; // Link Collection Address to Order
}
