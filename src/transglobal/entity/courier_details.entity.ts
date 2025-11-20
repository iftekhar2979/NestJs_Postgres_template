import { Order } from "src/orders/entities/order.entity";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, OneToOne } from "typeorm";

// ServicePriceBreakdown Entity
@Entity("service_price_breakdown")
export class ServicePriceBreakdown {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;

  @Column()
  description: string;

  @Column("decimal", { precision: 10, scale: 2 })
  cost: number;
}

// CollectionOptions Entity
@Entity("collection_options")
export class CollectionOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  collectionOptionTitle: string;

  @Column("decimal", { precision: 10, scale: 2 })
  collectionCharge: number;

  @Column()
  sameDayCollectionCutOffTime: string;

  @OneToMany(() => Service, (service) => service.collectionOptions)
  service: Service[];
}

// Service Entity
@Entity("service")
export class Service {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  quoteID: number;
  @Column()
  serviceID: number;

  @Column()
  serviceName: string;

  @Column()
  carrierName: string;

  @Column("decimal", { precision: 5, scale: 2 })
  chargeableWeight: number;

  @Column()
  transitTimeEstimate: string;

  @Column()
  sameDayCollectionCutOffTime: string;

  @Column("boolean")
  isWarehouseService: boolean;

  @Column("decimal", { precision: 10, scale: 2 })
  totalCostNetWithCollection: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalCostNetWithoutCollection: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalCostGrossWithCollection: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalCostGrossWithoutCollection: number;

  @OneToMany(() => ServicePriceBreakdown, (priceBreakdown) => priceBreakdown, {
    cascade: true,
  })
  @JoinColumn()
  servicePriceBreakdown: ServicePriceBreakdown[];

  @OneToMany(() => CollectionOption, (collectionOption) => collectionOption.service, {
    cascade: true,
  })
  @JoinColumn()
  collectionOptions: CollectionOption[];

  @Column("boolean")
  signatureRequiredAvailable: boolean;

  @Column()
  serviceType: string;

  @Column("jsonb", { nullable: true })
  optionalExtras: Record<string, any>;
  @OneToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;
}
