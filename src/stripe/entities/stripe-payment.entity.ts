import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity("stripe_payments")
export class StripePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  charge_id: string;

  @Index()
  @Column({ nullable: true })
  user_id: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @Column({ nullable: true })
  failure_reason: string;

  @Column({ type: "jsonb", nullable: true })
  raw_response: any;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
