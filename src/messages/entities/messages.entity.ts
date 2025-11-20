import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "src/user/entities/user.entity";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { MessageAttachment } from "src/attachment/entiies/attachments.entity";
import { Offer } from "src/offers/entities/offer.entity";
// Make sure this path is correct

@Entity("messages")
export class Messages {
  @ApiProperty({ example: 1, description: "Unique ID for the message" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "uuid-of-user", description: "User ID of sender" })
  @Column({ type: "uuid" })
  sender_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sender_id" })
  sender: User;
  @ApiProperty({ example: "1", description: "Offer Id" })
  @Column({ nullable: true, unique: false })
  offer_id: number;
  @ApiProperty({ example: "1", description: "Offer Id" })
  @Column({ nullable: true, unique: false })
  conversation_id: number;

  @ApiProperty({ example: "Hello!", description: "Message text" })
  @Column({ type: "text", nullable: true })
  msg?: string;
  @ApiProperty({ example: "Text", description: "Text | Image | Offer" })
  @Column({ type: "text", nullable: true })
  type?: "text" | "offer" | "image" | "video";

  @ApiProperty({ description: "Conversation this message belongs to" })
  @ManyToOne(() => Conversations, (conversation) => conversation.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversations;

  @ApiProperty({ type: () => [MessageAttachment], description: "Message attachments" })
  @OneToMany(() => MessageAttachment, (attachment) => attachment.message, { cascade: true })
  attachments?: MessageAttachment[];
  @ApiProperty({ type: () => Boolean, description: "Message Seen", example: "true" })
  @Column()
  isRead: Boolean;

  @ManyToOne(() => Offer)
  @JoinColumn({ name: "offer_id" })
  offer: Offer;
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
