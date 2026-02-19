import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailConfirmFlag1752676317840 implements MigrationInterface {
  name = 'AddEmailConfirmFlag1752676317840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailVerified" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
  }
}
