import { MigrationInterface, QueryRunner } from "typeorm";

export class AddYearsOfExperienceToParticipants1777767000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "participants"
        ADD COLUMN "yearsOfExperience" integer NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "participants"
        DROP COLUMN "yearsOfExperience"
    `);
  }
}
