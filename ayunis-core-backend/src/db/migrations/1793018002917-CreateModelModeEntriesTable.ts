import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModelModeEntriesTable1793018002917 implements MigrationInterface {
  name = 'CreateModelModeEntriesTable1793018002917';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."model_mode_entries_mode_enum" AS ENUM('auto', 'max')`,
    );
    await queryRunner.query(
      `CREATE TABLE "model_mode_entries" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "mode" "public"."model_mode_entries_mode_enum" NOT NULL, "modelId" character varying NOT NULL, "position" integer NOT NULL, "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_17f54d9ca38b8e8c1cb90f13d80" UNIQUE ("mode", "position"), CONSTRAINT "UQ_065da42399c3807f43bb48475fb" UNIQUE ("mode", "modelId"), CONSTRAINT "PK_d4914efc351287c26cf2ff4d16b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "model_mode_entries" ADD CONSTRAINT "FK_7b37960020abc6dee15a1a61d4a" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_mode_entries" DROP CONSTRAINT "FK_7b37960020abc6dee15a1a61d4a"`,
    );
    await queryRunner.query(`DROP TABLE "model_mode_entries"`);
    await queryRunner.query(
      `DROP TYPE "public"."model_mode_entries_mode_enum"`,
    );
  }
}
