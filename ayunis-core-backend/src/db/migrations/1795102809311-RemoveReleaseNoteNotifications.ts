import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveReleaseNoteNotifications1795102809311 implements MigrationInterface {
  name = 'RemoveReleaseNoteNotifications1795102809311';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_d12d8af700755c283a9b11ebce5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d12d8af700755c283a9b11ebce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "releaseNoteId"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('routine', 'routine_error')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('release_note', 'routine', 'routine_error')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "releaseNoteId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d12d8af700755c283a9b11ebce" ON "notifications" ("releaseNoteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_d12d8af700755c283a9b11ebce5" FOREIGN KEY ("releaseNoteId") REFERENCES "release_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
