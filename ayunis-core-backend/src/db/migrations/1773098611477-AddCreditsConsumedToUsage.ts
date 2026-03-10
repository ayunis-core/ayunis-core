import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditsConsumedToUsage1773098611477 implements MigrationInterface {
  name = 'AddCreditsConsumedToUsage1773098611477';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ADD "creditsConsumed" numeric(16,6)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" DROP COLUMN "creditsConsumed"`,
    );
  }
}
