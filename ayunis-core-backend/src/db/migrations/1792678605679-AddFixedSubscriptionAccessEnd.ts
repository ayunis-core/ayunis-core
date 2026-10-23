import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFixedSubscriptionAccessEnd1792678605679 implements MigrationInterface {
  name = 'AddFixedSubscriptionAccessEnd1792678605679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "fixedAccessEndsAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "fixedAccessEndsAt"`,
    );
  }
}
