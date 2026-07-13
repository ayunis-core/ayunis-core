import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWelcomeVideoSeenAtToOnboarding1785960558295 implements MigrationInterface {
  name = 'AddWelcomeVideoSeenAtToOnboarding1785960558295';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" ADD "welcomeVideoSeenAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" DROP COLUMN "welcomeVideoSeenAt"`,
    );
  }
}
