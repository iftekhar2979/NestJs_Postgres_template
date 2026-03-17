import { Product } from "src/products/entities/products.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Inventory } from "./inventory.entity";

export enum InventoryAction {
  INIT = "INIT",
  UPDATE = "UPDATE",
  RESERVE = "RESERVE",
  CONFIRM = "CONFIRM",
  RELEASE = "RELEASE",
}

@Entity("inventory_logs")
export class InventoryLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "product_id" })
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "inventory_id" })
  inventory_id: number;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: "inventory_id" })
  inventory: Inventory;

  @Column({ type: "enum", enum: InventoryAction })
  action: InventoryAction;

  @Column({ type: "int" })
  previous_value: number;

  @Column({ type: "int" })
  new_value: number;

  @Column({ type: "text", nullable: true })
  reason: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
