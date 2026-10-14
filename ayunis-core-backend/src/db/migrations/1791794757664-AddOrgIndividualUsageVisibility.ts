import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgIndividualUsageVisibility1791794757664 implements MigrationInterface {
  name = 'AddOrgIndividualUsageVisibility1791794757664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orgs" ADD "hideIndividualUsage" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orgs" DROP COLUMN "hideIndividualUsage"`,
    );
  }
}
