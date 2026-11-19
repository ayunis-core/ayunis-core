import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseNoteThreadOrigin1795122030541 implements MigrationInterface {
  name = 'AddReleaseNoteThreadOrigin1795122030541';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The origin checks compare with values of the replaced enum type, so they
    // cannot survive the column's type change; they are restored right after.
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_411d827169b9eda159834c2388"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."threads_origin_enum" RENAME TO "threads_origin_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum" AS ENUM('chat', 'routine', 'notification', 'release_note')`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_18f52552eacd5f3a9f0fed1642"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_411d827169b9eda159834c2388"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum_old" AS ENUM('chat', 'notification', 'routine')`,
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
  }
}
