import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoadedCapabilityIdsToThreads1795262876519 implements MigrationInterface {
  name = 'AddLoadedCapabilityIdsToThreads1795262876519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "loaded_capability_ids" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "loaded_capability_ids"`,
    );
  }
}
