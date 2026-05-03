import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsersTable1777766400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "firstName",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "lastName",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "email",
            type: "varchar",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "password",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "isAdmin",
            type: "boolean",
            isNullable: false,
            default: false,
          },
          {
            name: "createdAt",
            type: "timestamp with time zone",
            isNullable: false,
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp with time zone",
            isNullable: false,
            default: "now()",
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users");
  }
}
