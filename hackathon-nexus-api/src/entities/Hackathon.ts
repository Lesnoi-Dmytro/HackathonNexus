import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HackathonTopic } from "../models/enums";
import { User } from "./User";

@Entity("hackathons")
export class Hackathon {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: "CASCADE" })
  createdBy!: User;

  @Column()
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "enum", enum: HackathonTopic })
  topic!: HackathonTopic;

  @Column({ type: "timestamptz" })
  startDate!: Date;

  @Column({ type: "int" })
  durationHours!: number;

  @Column({ type: "int" })
  maxTeamSize!: number;

  @Column({ type: "text", nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
