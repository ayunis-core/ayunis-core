import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeToRoutines1795597761556 implements MigrationInterface {
  name = 'AddModeToRoutines1795597761556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."routines_mode_enum" AS ENUM('auto', 'max')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "mode" "public"."routines_mode_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "CHK_d8708cf77e6f6e6f52d5f2dee7" CHECK (num_nonnulls("modelId", "mode") <= 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" DROP CONSTRAINT "CHK_d8708cf77e6f6e6f52d5f2dee7"`,
    );
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "mode"`);
    await queryRunner.query(`DROP TYPE "public"."routines_mode_enum"`);
  }
}
