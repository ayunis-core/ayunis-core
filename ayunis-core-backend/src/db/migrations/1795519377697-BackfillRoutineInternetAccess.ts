import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every routine the internet access its toggle had before the next
 * migration drops `internetEnabled`: on becomes `all`, off stays `off`.
 */
export class BackfillRoutineInternetAccess1795519377697 implements MigrationInterface {
  name = 'BackfillRoutineInternetAccess1795519377697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "routines" SET "internetAccess" = CASE WHEN "internetEnabled" THEN 'all'::"public"."routines_internetaccess_enum" ELSE 'off'::"public"."routines_internetaccess_enum" END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The next migration's down() restores `internetEnabled` as false for
    // every routine; a routine limited to domains had internet access.
    await queryRunner.query(
      `UPDATE "routines" SET "internetEnabled" = ("internetAccess" <> 'off')`,
    );
  }
}
