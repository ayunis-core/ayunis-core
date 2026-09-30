import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceRunState1790785074474 implements MigrationInterface {
  name = 'AddSourceRunState1790785074474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "lastIndexedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "lastRunFailedAt" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "sources" ADD "lastRunError" text`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "lastRunErrorCode" character varying`,
    );
    // Backfill: a READY text source's last update is the best available
    // record of when its content went live. Data sources are not indexed,
    // so their lastIndexedAt stays null like that of new data sources.
    // Data-only; no schema drift.
    await queryRunner.query(
      `UPDATE "sources" SET "lastIndexedAt" = "updatedAt" WHERE "type" = 'text' AND "status" = 'ready' AND "lastIndexedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "lastRunErrorCode"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "lastRunError"`);
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "lastRunFailedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "lastIndexedAt"`,
    );
  }
}
