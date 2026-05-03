import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TeamRequestStatus, TeamRequestType } from "../models/enums";
import { Participant } from "./Participant";
import { Team } from "./Team";

@Entity("team_requests")
export class TeamRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: TeamRequestType })
  type!: TeamRequestType;

  @Column({ type: "enum", enum: TeamRequestStatus, default: TeamRequestStatus.PENDING })
  status!: TeamRequestStatus;

  /** The team this request/invite belongs to */
  @ManyToOne(() => Team, { nullable: false, eager: false, onDelete: "CASCADE" })
  team!: Team;

  /**
   * For JOIN_REQUEST: the participant who wants to join.
   * For INVITE: the participant being invited.
   */
  @ManyToOne(() => Participant, { nullable: false, eager: false, onDelete: "CASCADE" })
  participant!: Participant;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
