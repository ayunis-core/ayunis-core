import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the `academy_lessons` table to `academy_course_modules` (AYC-328).
 *
 * Hand-authored on purpose: TypeORM's migration:generate cannot express a table
 * rename — it would CREATE a fresh `academy_course_modules` and orphan the
 * existing `academy_lessons` data. This migration renames the table in place and
 * renames the primary key, index, and foreign key to the deterministic names
 * TypeORM derives from the new table name, keeping schema drift at zero.
 */
export class RenameAcademyLessonsToCourseModules1782895810525 implements MigrationInterface {
  name = 'RenameAcademyLessonsToCourseModules1782895810525';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_lessons" RENAME TO "academy_course_modules"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_course_modules" RENAME CONSTRAINT "PK_473048a74027e35086529d18488" TO "PK_b5fb5b668f5d51a81d123bfdfed"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_53d374c31fe02d9a59daf7392d" RENAME TO "IDX_3c6878b08b65cdbea08bd7bb02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_course_modules" RENAME CONSTRAINT "FK_53d374c31fe02d9a59daf7392d4" TO "FK_3c6878b08b65cdbea08bd7bb024"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_course_modules" RENAME CONSTRAINT "FK_3c6878b08b65cdbea08bd7bb024" TO "FK_53d374c31fe02d9a59daf7392d4"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_3c6878b08b65cdbea08bd7bb02" RENAME TO "IDX_53d374c31fe02d9a59daf7392d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_course_modules" RENAME CONSTRAINT "PK_b5fb5b668f5d51a81d123bfdfed" TO "PK_473048a74027e35086529d18488"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_course_modules" RENAME TO "academy_lessons"`,
    );
  }
}
