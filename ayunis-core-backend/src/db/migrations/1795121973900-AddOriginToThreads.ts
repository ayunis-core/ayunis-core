import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginToThreads1795121973900 implements MigrationInterface {
  name = 'AddOriginToThreads1795121973900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."threads_origin_enum" AS ENUM('chat', 'routine', 'notification')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "origin" "public"."threads_origin_enum" NOT NULL DEFAULT 'chat'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "origin"`);
    await queryRunner.query(`DROP TYPE "public"."threads_origin_enum"`);
  }
}
