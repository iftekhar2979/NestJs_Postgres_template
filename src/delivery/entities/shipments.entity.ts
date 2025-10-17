import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { OrderInvoice } from "./shipment_order_invoice.entity";
import { Label } from "./shipment_lable.entity";
// import { Document } from './shipment_document.entity';
import { Order } from "src/orders/entities/order.entity";
import { ShipmentDocument } from "./shipment_document.entity";

@Entity("shipments")
export class Shipment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  Status: string;
  @Column()
  order_id: number;

  // @
  @OneToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;
  @Column()
  orderReference: string;

  @Column({ nullable: true })
  trackingURL: string;

  @OneToOne(() => OrderInvoice, (orderInvoice) => orderInvoice.shipment, { cascade: true })
  orderInvoice: OrderInvoice;

  @OneToMany(() => Label, (label) => label.shipment, { cascade: true, nullable: true })
  labels: Label[];

  @OneToMany(() => ShipmentDocument, (document) => document.shipment, { cascade: true, nullable: true })
  documents: ShipmentDocument[];
}
