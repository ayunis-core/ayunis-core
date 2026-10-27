import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionExpiryProcessedAt1793118051605 implements MigrationInterface {
  name = 'AddSubscriptionExpiryProcessedAt1793118051605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "expiryProcessedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "expiryProcessedAt"`,
    );
  }
}
