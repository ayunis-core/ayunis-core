import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketingConsent1756977823146 implements MigrationInterface {
  name = 'AddMarketingConsent1756977823146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "hasAcceptedMarketing" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "hasAcceptedMarketing"`,
    );
  }
}
