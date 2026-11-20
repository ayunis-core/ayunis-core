import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingOriginToThreads1795162997413 implements MigrationInterface {
  name = 'AddOnboardingOriginToThreads1795162997413';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."threads_onboardingstage_enum" AS ENUM('profile', 'first_skill')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "onboardingStage" "public"."threads_onboardingstage_enum"`,
    );
    // The origin checks compare with values of the replaced enum type, so they
    // cannot survive the column's type change; they are restored right after.
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_411d827169b9eda159834c2388"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."threads_origin_enum" RENAME TO "threads_origin_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum" AS ENUM('chat', 'routine', 'notification', 'release_note', 'onboarding')`,
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
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_411d827169b9eda159834c2388" CHECK ("sourceNotificationId" IS NULL OR "origin" = 'notification')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642" CHECK ("routineId" IS NULL OR "origin" = 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb" CHECK ("sourceReleaseNoteId" IS NULL OR "origin" = 'release_note')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_95202e5cfc370ad32a29a0516f" CHECK (("onboardingStage" IS NOT NULL) = ("origin" = 'onboarding'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_95202e5cfc370ad32a29a0516f"`,
    );
    // The old enum has no onboarding kind; onboarding chats become plain chats.
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'chat' WHERE "origin" = 'onboarding'`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_411d827169b9eda159834c2388"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum_old" AS ENUM('chat', 'notification', 'release_note', 'routine')`,
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
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_411d827169b9eda159834c2388" CHECK ("sourceNotificationId" IS NULL OR "origin" = 'notification')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642" CHECK ("routineId" IS NULL OR "origin" = 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb" CHECK ("sourceReleaseNoteId" IS NULL OR "origin" = 'release_note')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "onboardingStage"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."threads_onboardingstage_enum"`,
    );
  }
}
