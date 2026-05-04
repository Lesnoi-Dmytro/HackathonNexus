import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HackathonTopic } from "../models/enums";
import { Participant } from "./Participant";
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

  @Column({ type: "int", nullable: true })
  maxParticipants?: number;

  @ManyToMany(() => Participant, { eager: false })
  @JoinTable({
    name: "hackathon_registrations",
    joinColumn: { name: "hackathonId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "participantId", referencedColumnName: "id" },
  })
  registrants!: Participant[];

  @Column({ type: "text", nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
