import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivatedToUsers1779108744898 implements MigrationInterface {
  name = 'AddActivatedToUsers1779108744898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "activated" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "activated"`);
  }
}
