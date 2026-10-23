import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueThreadSourceAssignments1792764440690 implements MigrationInterface {
  name = 'UniqueThreadSourceAssignments1792764440690';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Block assignment writes until deduplication and the constraint are committed.
    await queryRunner.query(
      `LOCK TABLE "thread_source_assignments" IN ACCESS EXCLUSIVE MODE`,
    );
    await queryRunner.query(`
            DELETE FROM "thread_source_assignments" AS assignment
            USING (
                SELECT "id", ROW_NUMBER() OVER (
                    PARTITION BY "threadId", "sourceId"
                    ORDER BY "createdAt" ASC, "id" ASC
                ) AS position
                FROM "thread_source_assignments"
            ) AS ranked
            WHERE assignment."id" = ranked."id" AND ranked.position > 1
        `);
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" ADD CONSTRAINT "UQ_124528fae5454666e09afb37163" UNIQUE ("threadId", "sourceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" DROP CONSTRAINT "UQ_124528fae5454666e09afb37163"`,
    );
  }
}
