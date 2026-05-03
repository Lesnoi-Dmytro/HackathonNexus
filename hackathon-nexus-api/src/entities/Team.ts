import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Hackathon } from "./Hackathon";
import { Participant } from "./Participant";

@Entity("teams")
export class Team {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Hackathon, { nullable: false, eager: false, onDelete: "CASCADE" })
  hackathon!: Hackathon;

  @ManyToOne(() => Participant, { nullable: false, eager: false, onDelete: "CASCADE" })
  @JoinColumn()
  leader!: Participant;

  @ManyToMany(() => Participant, { eager: false })
  @JoinTable({
    name: "team_members",
    joinColumn: { name: "teamId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "participantId", referencedColumnName: "id" },
  })
  members!: Participant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
