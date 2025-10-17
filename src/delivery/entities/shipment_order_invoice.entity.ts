import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne } from "typeorm";
import { Shipment } from "./shipments.entity";

@Entity("order_invoices")
export class OrderInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar")
  InvoiceReference: string;
  @Column("decimal", {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number): number => value,
      from: (value: string): number => parseFloat(value),
    },
  })
  TotalNet: number;

  @Column("decimal", {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number): number => value,
      from: (value: string): number => parseFloat(value),
    },
  })
  Tax: number;

  @Column("decimal", {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number): number => value,
      from: (value: string): number => parseFloat(value),
    },
  })
  TotalGross: number;
  @Column("jsonb")
  InvoiceItems: Record<string, any>[];

  @OneToOne(() => Shipment, (shipment) => shipment.orderInvoice)
  shipment: Shipment; // Link back to Shipment
}
