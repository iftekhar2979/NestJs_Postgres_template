import { Conversations } from "src/conversations/entities/conversations.entity";
import { Messages } from "src/messages/entities/messages.entity";
import { Product } from "src/products/entities/products.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("conversation_participants")
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversations, (conversation) => conversation.participants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversations;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "boolean", default: false })
  isMuted: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  joined_at: Date;
}
