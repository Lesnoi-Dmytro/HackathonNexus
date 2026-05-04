import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatRoomType } from "../models/enums";
import { Message } from "./Message";
import { Team } from "./Team";
import { User } from "./User";

@Entity("chat_rooms")
export class ChatRoom {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: ChatRoomType })
  type!: ChatRoomType;

  /** Populated only for TEAM rooms. */
  @ManyToOne(() => Team, { nullable: true, eager: false, onDelete: "CASCADE" })
  @JoinColumn()
  team?: Team;

  @Column({ nullable: true })
  teamId?: string;

  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: "chat_room_members",
    joinColumn: { name: "chatRoomId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "userId", referencedColumnName: "id" },
  })
  members!: User[];

  @OneToMany(() => Message, (msg) => msg.chatRoom, { cascade: ["insert"] })
  messages!: Message[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
