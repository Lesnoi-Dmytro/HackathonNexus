import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamRequestsTable1777766800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "team_request_type_enum" AS ENUM ('join_request', 'invite')
    `);

    await queryRunner.query(`
      CREATE TYPE "team_request_status_enum" AS ENUM ('pending', 'accepted', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "team_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "team_request_type_enum" NOT NULL,
        "status" "team_request_status_enum" NOT NULL DEFAULT 'pending',
        "teamId" uuid NOT NULL,
        "participantId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_requests_team" FOREIGN KEY ("teamId")
          REFERENCES "teams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_requests_participant" FOREIGN KEY ("participantId")
          REFERENCES "participants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "team_requests"`);
    await queryRunner.query(`DROP TYPE "team_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "team_request_type_enum"`);
  }
}
