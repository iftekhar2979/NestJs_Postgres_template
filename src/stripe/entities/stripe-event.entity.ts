import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

@Entity("stripe_events")
export class StripeEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  event_id: string;

  @Column()
  type: string;

  @Column({ default: false })
  processed: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
