import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnboardingTable1782229825901 implements MigrationInterface {
  name = 'CreateOnboardingTable1782229825901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "onboarding" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "completedStepIds" text array NOT NULL DEFAULT '{}', "hidden" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_f2baf27f040b7c72a6d93a0cf9a" UNIQUE ("userId"), CONSTRAINT "PK_b8b6cfe63674aaee17874f033cf" PRIMARY KEY ("id"))`,
    );
    // Migrate any existing onboarding data from users into the new table
    await queryRunner.query(
      `INSERT INTO "onboarding" ("id", "userId", "completedStepIds", "hidden")
       SELECT u."id", u."id", COALESCE(u."onboardingCompletedStepIds", '{}'), COALESCE(u."onboardingHidden", false)
       FROM "users" u`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboardingHidden"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboardingCompletedStepIds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "onboarding" ADD CONSTRAINT "FK_f2baf27f040b7c72a6d93a0cf9a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" DROP CONSTRAINT "FK_f2baf27f040b7c72a6d93a0cf9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboardingCompletedStepIds" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboardingHidden" boolean NOT NULL DEFAULT false`,
    );
    // Restore data back onto users table for symmetry
    await queryRunner.query(
      `UPDATE "users" u
       SET "onboardingCompletedStepIds" = o."completedStepIds",
           "onboardingHidden" = o."hidden"
       FROM "onboarding" o
       WHERE o."userId" = u."id"`,
    );
    await queryRunner.query(`DROP TABLE "onboarding"`);
  }
}
