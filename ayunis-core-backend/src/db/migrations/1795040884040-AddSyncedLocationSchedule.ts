import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedLocationSchedule1795040884040 implements MigrationInterface {
  name = 'AddSyncedLocationSchedule1795040884040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD "nextSyncAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD "syncingSince" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD "pausedUntil" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c1c6c46463f85427ac187c0f0c" ON "knowledge_base_synced_locations" ("nextSyncAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c1c6c46463f85427ac187c0f0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP COLUMN "pausedUntil"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP COLUMN "syncingSince"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP COLUMN "nextSyncAt"`,
    );
  }
}
