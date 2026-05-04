import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHackathonRegistrations1777767100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      ADD COLUMN IF NOT EXISTS "maxParticipants" integer
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hackathon_registrations" (
        "hackathonId" uuid NOT NULL,
        "participantId" uuid NOT NULL,
        CONSTRAINT "PK_hackathon_registrations" PRIMARY KEY ("hackathonId", "participantId"),
        CONSTRAINT "FK_hr_hackathon" FOREIGN KEY ("hackathonId")
          REFERENCES "hackathons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_hr_participant" FOREIGN KEY ("participantId")
          REFERENCES "participants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hackathon_registrations"`);
    await queryRunner.query(`ALTER TABLE "hackathons" DROP COLUMN IF EXISTS "maxParticipants"`);
  }
}
