import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveActivatedFromUsers1780000000000 implements MigrationInterface {
  name = 'RemoveActivatedFromUsers1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "activated"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "activated" boolean NOT NULL DEFAULT true`,
    );
  }
}
