import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeeklyAndMonthlySchedulesToRoutines1795532811454 implements MigrationInterface {
  name = 'AddWeeklyAndMonthlySchedulesToRoutines1795532811454';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."routines_frequency_enum" AS ENUM('daily', 'weekly', 'monthly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "frequency" "public"."routines_frequency_enum" NOT NULL DEFAULT 'daily'`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "weekdays" smallint array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "routines" ADD "monthDay" smallint`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "monthDay"`);
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "weekdays"`);
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "frequency"`);
    await queryRunner.query(`DROP TYPE "public"."routines_frequency_enum"`);
  }
}
