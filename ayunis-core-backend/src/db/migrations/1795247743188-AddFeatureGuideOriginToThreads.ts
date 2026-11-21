import type { MigrationInterface, QueryRunner } from 'typeorm';

const ORIGIN_CHECKS = [
  [
    'CHK_411d827169b9eda159834c2388',
    `"sourceNotificationId" IS NULL OR "origin" = 'notification'`,
  ],
  [
    'CHK_18f52552eacd5f3a9f0fed1642',
    `"routineId" IS NULL OR "origin" = 'routine'`,
  ],
  [
    'CHK_3a8c4bebdc039f2d9563b6edeb',
    `"sourceReleaseNoteId" IS NULL OR "origin" = 'release_note'`,
  ],
  [
    'CHK_95202e5cfc370ad32a29a0516f',
    `("onboardingStage" IS NOT NULL) = ("origin" = 'onboarding')`,
  ],
] as const;

export class AddFeatureGuideOriginToThreads1795247743188 implements MigrationInterface {
  name = 'AddFeatureGuideOriginToThreads1795247743188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."threads_guidefeature_enum" AS ENUM('knowledge_bases', 'skills', 'workspaces', 'routines', 'recordings')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "guideFeature" "public"."threads_guidefeature_enum"`,
    );
    // The origin checks compare with values of the replaced enum type, so they
    // cannot survive the column's type change; they are restored right after.
    await dropOriginChecks(queryRunner);
    await queryRunner.query(
      `ALTER TYPE "public"."threads_origin_enum" RENAME TO "threads_origin_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum" AS ENUM('chat', 'routine', 'notification', 'release_note', 'onboarding', 'feature_guide')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" TYPE "public"."threads_origin_enum" USING "origin"::"text"::"public"."threads_origin_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" SET DEFAULT 'chat'`,
    );
    await queryRunner.query(`DROP TYPE "public"."threads_origin_enum_old"`);
    await restoreOriginChecks(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_49d43ffbc8167e7b126ea73705" CHECK (("guideFeature" IS NOT NULL) = ("origin" = 'feature_guide'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_49d43ffbc8167e7b126ea73705"`,
    );
    // The old enum has no feature-guide kind; feature-guide chats become plain chats.
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'chat' WHERE "origin" = 'feature_guide'`,
    );
    await dropOriginChecks(queryRunner);
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum_old" AS ENUM('chat', 'notification', 'onboarding', 'release_note', 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" TYPE "public"."threads_origin_enum_old" USING "origin"::"text"::"public"."threads_origin_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ALTER COLUMN "origin" SET DEFAULT 'chat'`,
    );
    await queryRunner.query(`DROP TYPE "public"."threads_origin_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."threads_origin_enum_old" RENAME TO "threads_origin_enum"`,
    );
    await restoreOriginChecks(queryRunner);
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "guideFeature"`);
    await queryRunner.query(`DROP TYPE "public"."threads_guidefeature_enum"`);
  }
}

async function dropOriginChecks(queryRunner: QueryRunner): Promise<void> {
  for (const [name] of ORIGIN_CHECKS) {
    await queryRunner.query(`ALTER TABLE "threads" DROP CONSTRAINT "${name}"`);
  }
}

async function restoreOriginChecks(queryRunner: QueryRunner): Promise<void> {
  for (const [name, expression] of ORIGIN_CHECKS) {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "${name}" CHECK (${expression})`,
    );
  }
}
