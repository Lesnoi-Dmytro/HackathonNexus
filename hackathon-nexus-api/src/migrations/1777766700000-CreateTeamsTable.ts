import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamsTable1777766700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "hackathonId" uuid NOT NULL,
        "leaderId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_hackathon" FOREIGN KEY ("hackathonId")
          REFERENCES "hackathons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_teams_leader" FOREIGN KEY ("leaderId")
          REFERENCES "participants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "teamId" uuid NOT NULL,
        "participantId" uuid NOT NULL,
        CONSTRAINT "PK_team_members" PRIMARY KEY ("teamId", "participantId"),
        CONSTRAINT "FK_team_members_team" FOREIGN KEY ("teamId")
          REFERENCES "teams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_members_participant" FOREIGN KEY ("participantId")
          REFERENCES "participants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
