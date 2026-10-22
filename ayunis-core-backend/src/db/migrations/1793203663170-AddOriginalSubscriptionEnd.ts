import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalSubscriptionEnd1793203663170 implements MigrationInterface {
  name = 'AddOriginalSubscriptionEnd1793203663170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "originalEndsAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "originalEndsAt"`,
    );
  }
}
