import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Routines created before `nextRunAt` existed would never be due. Marking
 * them as missed two days ago (always an earlier Berlin day, even across a
 * 25-hour DST day) lets the next sweep skip that run and compute the real
 * next start, so nothing runs at deploy time and the schedule logic stays in
 * the domain code.
 */
export class ScheduleExistingRoutines1794022356793 implements MigrationInterface {
  name = 'ScheduleExistingRoutines1794022356793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "routines" SET "nextRunAt" = now() - interval '2 days' WHERE "enabled" = true AND "nextRunAt" IS NULL`,
    );
  }

  public async down(): Promise<void> {
    // Data only; the previous migration's down() drops the column.
  }
}
