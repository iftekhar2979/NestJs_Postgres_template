import { ApiProperty } from "@nestjs/swagger";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("wallets")
export class Wallets {
  @ApiProperty({ example: 1, description: "Unique Id for wallet" })
  @PrimaryGeneratedColumn()
  id: number;
  @ApiProperty({ example: "uuid-of-user", description: " user ID" })
  @Column()
  user_id: string;
  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
  @ApiProperty({ example: 99.99, description: "Offered price" })
  @Column("float", { default: 0 })
  balance: number;
  @ApiProperty({ example: "dollar", description: "Currenty " })
  @Column("varchar", { default: "GBM", nullable: true })
  currency: string;
  @ApiProperty({ example: 9, description: "Wallet Version " })
  @Column("int", { default: 0 })
  version: number;
  @ApiProperty({ description: "Timestamp when the offer was created" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
  @ApiProperty({ description: "Timestamp when the offer was last updated" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
