import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppNotification } from "../socket/notifications";
import { User } from "./User";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** The user who should receive this notification */
  @ManyToOne(() => User, { onDelete: "CASCADE", eager: false })
  recipient!: User;

  /** Discriminated-union payload — stored as JSONB */
  @Column({ type: "jsonb" })
  payload!: AppNotification;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
