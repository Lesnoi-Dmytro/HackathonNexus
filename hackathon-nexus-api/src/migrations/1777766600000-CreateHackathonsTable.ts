import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHackathonsTable1777766600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "hackathon_topic_enum" AS ENUM (
        'AI / Machine Learning',
        'AR / VR',
        'Blockchain / Web3',
        'Cybersecurity',
        'FinTech',
        'Game Development',
        'HealthTech',
        'IoT & Embedded',
        'Mobile Development',
        'Web Development'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "hackathons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdById" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "topic" "hackathon_topic_enum" NOT NULL,
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "durationHours" integer NOT NULL,
        "maxTeamSize" integer NOT NULL,
        "imageUrl" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hackathons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hackathons_user" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hackathons"`);
    await queryRunner.query(`DROP TYPE "hackathon_topic_enum"`);
  }
}
