import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeToThreads1793018512829 implements MigrationInterface {
  name = 'AddModeToThreads1793018512829';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."threads_mode_enum" AS ENUM('auto', 'max')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "mode" "public"."threads_mode_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "mode"`);
    await queryRunner.query(`DROP TYPE "public"."threads_mode_enum"`);
  }
}
