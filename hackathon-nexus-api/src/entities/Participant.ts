import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Position, Skill } from "../models/enums";
import { User } from "./User";

@Entity("participants")
export class Participant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => User, (user) => user.participant, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: User;

  @Column({ type: "text", nullable: true })
  experience?: string;

  @Column({ type: "int", nullable: true })
  yearsOfExperience?: number;

  @Column({ type: "enum", enum: Skill, array: true, default: [] })
  skills!: Skill[];

  @Column({ type: "enum", enum: Position, nullable: true })
  position?: Position;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
