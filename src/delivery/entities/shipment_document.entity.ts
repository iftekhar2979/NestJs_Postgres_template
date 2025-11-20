import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Shipment } from "./shipments.entity";

@Entity("documents")
export class ShipmentDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentType: string;

  @Column()
  format: string;

  @Column()
  downloadURL: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.documents)
  shipment: Shipment; // Link back to the Shipment
}
