import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseNoteNotificationsWithMedia1794068792106 implements MigrationInterface {
  name = 'AddReleaseNoteNotificationsWithMedia1794068792106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_mediatype_enum" AS ENUM('image', 'loom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "mediaType" "public"."notifications_mediatype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "mediaUrl" character varying(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "mediaStorageKey" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "mediaContentType" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('routine', 'routine_error', 'release_note')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "subheadline" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "CHK_0dad12e6aba452adaa9d3eab95" CHECK (("mediaType" IS NULL AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'loom' AND "mediaUrl" IS NOT NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'image' AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NOT NULL AND "mediaContentType" IS NOT NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "CHK_0dad12e6aba452adaa9d3eab95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "subheadline" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('routine', 'routine_error')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "mediaContentType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "mediaStorageKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "mediaUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "mediaType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notifications_mediatype_enum"`,
    );
  }
}
