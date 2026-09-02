import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountLockoutToUsers1787578189989 implements MigrationInterface {
  name = 'AddAccountLockoutToUsers1787578189989';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failedLoginWindowStartedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lockedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lockedAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failedLoginWindowStartedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"`,
    );
  }
}
