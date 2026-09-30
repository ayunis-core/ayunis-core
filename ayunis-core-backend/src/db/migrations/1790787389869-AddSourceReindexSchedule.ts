import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceReindexSchedule1790787389869 implements MigrationInterface {
  name = 'AddSourceReindexSchedule1790787389869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "reindexIntervalValue" integer`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_reindexintervalunit_enum" AS ENUM('weeks', 'months')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "reindexIntervalUnit" "public"."sources_reindexintervalunit_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "nextReindexAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24fc50dac70a0aea50911d435f" ON "sources" ("nextReindexAt") WHERE "nextReindexAt" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_48a97b0d88f59206963221f1f1" CHECK (("reindexIntervalValue" IS NULL) = ("reindexIntervalUnit" IS NULL) AND ("reindexIntervalValue" IS NULL) = ("nextReindexAt" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_48a97b0d88f59206963221f1f1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24fc50dac70a0aea50911d435f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "nextReindexAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "reindexIntervalUnit"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."sources_reindexintervalunit_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "reindexIntervalValue"`,
    );
  }
}
