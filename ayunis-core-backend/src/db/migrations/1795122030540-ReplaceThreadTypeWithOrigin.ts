import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceThreadTypeWithOrigin1795122030540 implements MigrationInterface {
  name = 'ReplaceThreadTypeWithOrigin1795122030540';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."threads_type_enum"`);
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
      `CREATE TYPE "public"."threads_type_enum" AS ENUM('chat', 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "type" "public"."threads_type_enum" NOT NULL DEFAULT 'chat'`,
    );
  }
}
