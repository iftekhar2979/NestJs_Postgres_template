import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Shipment } from "./shipments.entity";

@Entity("labels")
export class Label {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  labelRole: string;

  @Column()
  labelFormat: string;

  @Column()
  airWaybillReference: string;

  @Column()
  downloadURL: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.labels)
  shipment: Shipment; // Link back to the Shipment
}
