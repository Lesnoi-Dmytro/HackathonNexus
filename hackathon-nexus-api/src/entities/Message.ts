import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

@Entity("messages")
@Index("IDX_messages_room_created", ["chatRoomId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages, {
    nullable: false,
    eager: false,
    onDelete: "CASCADE",
  })
  chatRoom!: ChatRoom;

  @Column()
  chatRoomId!: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: "CASCADE" })
  sender!: User;

  @Column()
  senderId!: string;

  @Column({ type: "text" })
  content!: string;

  // Future: attachments support
  // @Column({ type: "jsonb", nullable: true })
  // attachments?: MessageAttachment[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
