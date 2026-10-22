import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSubscriptionEndsAt1793203591999 implements MigrationInterface {
  name = 'RenameSubscriptionEndsAt1793203591999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "accessEndsAt" TO "endsAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" RENAME COLUMN "accessEndsAt" TO "endsAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" RENAME COLUMN "endsAt" TO "accessEndsAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "endsAt" TO "accessEndsAt"`,
    );
  }
}
