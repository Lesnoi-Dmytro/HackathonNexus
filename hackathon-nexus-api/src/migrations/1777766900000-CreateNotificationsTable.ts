import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationsTable1777766900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "recipientId"  uuid              NOT NULL,
        "payload"      jsonb             NOT NULL,
        "read"         boolean           NOT NULL DEFAULT false,
        "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient"
          FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_created"
        ON "notifications" ("recipientId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_recipient_created"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
