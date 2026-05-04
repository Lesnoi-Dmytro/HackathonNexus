import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessagesTable1777767300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum for chat room types
    await queryRunner.query(`
      CREATE TYPE "chat_room_type_enum" AS ENUM ('team', 'direct')
    `);

    // Chat rooms (team-wide or direct/DM)
    await queryRunner.query(`
      CREATE TABLE "chat_rooms" (
        "id"        uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "type"      "chat_room_type_enum"    NOT NULL,
        "teamId"    uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_rooms_team"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_chat_rooms_team"
        ON "chat_rooms" ("teamId")
        WHERE "teamId" IS NOT NULL
    `);

    // Members of each chat room
    await queryRunner.query(`
      CREATE TABLE "chat_room_members" (
        "chatRoomId" uuid NOT NULL,
        "userId"     uuid NOT NULL,
        CONSTRAINT "PK_chat_room_members" PRIMARY KEY ("chatRoomId", "userId"),
        CONSTRAINT "FK_chat_room_members_room"
          FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_room_members_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_room_members_user"
        ON "chat_room_members" ("userId")
    `);

    // Messages
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id"          uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "chatRoomId"  uuid                     NOT NULL,
        "senderId"    uuid                     NOT NULL,
        "content"     text                     NOT NULL,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_chat_room"
          FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_sender"
          FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_messages_room_created"
        ON "messages" ("chatRoomId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_messages_room_created"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_room_members_user"`);
    await queryRunner.query(`DROP TABLE "chat_room_members"`);
    await queryRunner.query(`DROP INDEX "UQ_chat_rooms_team"`);
    await queryRunner.query(`DROP TABLE "chat_rooms"`);
    await queryRunner.query(`DROP TYPE "chat_room_type_enum"`);
  }
}
