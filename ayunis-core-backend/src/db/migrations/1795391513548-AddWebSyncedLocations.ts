import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebSyncedLocations1795391513548 implements MigrationInterface {
  name = 'AddWebSyncedLocations1795391513548';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD "depth" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD "fileName" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD "url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "CHK_86c6609cfd7b3b2182af74c7a8" CHECK ("depth" BETWEEN 0 AND 2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "CHK_17c8d5851e4bf757c4aae55571" CHECK (("provider" = 'web') = ("depth" IS NOT NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "CHK_17c8d5851e4bf757c4aae55571"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "CHK_86c6609cfd7b3b2182af74c7a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP COLUMN "url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP COLUMN "fileName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP COLUMN "depth"`,
    );
  }
}
