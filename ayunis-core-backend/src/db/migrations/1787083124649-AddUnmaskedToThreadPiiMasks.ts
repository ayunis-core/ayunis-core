import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnmaskedToThreadPiiMasks1787083124649 implements MigrationInterface {
  name = 'AddUnmaskedToThreadPiiMasks1787083124649';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_pii_masks" ADD "unmasked" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_pii_masks" DROP COLUMN "unmasked"`,
    );
  }
}
