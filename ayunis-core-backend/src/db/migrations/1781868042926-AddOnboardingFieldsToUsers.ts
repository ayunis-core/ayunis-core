import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingFieldsToUsers1781868042926 implements MigrationInterface {
  name = 'AddOnboardingFieldsToUsers1781868042926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboardingCompletedStepIds" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboardingHidden" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboardingHidden"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboardingCompletedStepIds"`,
    );
  }
}
