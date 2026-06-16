import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastActivityAtToThreads1781641427435 implements MigrationInterface {
  name = 'AddLastActivityAtToThreads1781641427435';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "lastActivityAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75bb0778b90741be9a49adfc24" ON "threads" ("lastActivityAt") `,
    );
    // Backfill existing rows from the most recent message, falling back to
    // the thread's creation time for empty threads. Without this, every
    // pre-existing thread's activity would default to its creation date,
    // which could cause retention to delete old-but-recently-active
    // threads on the first enforcement run. Data-only; no schema drift.
    await queryRunner.query(`
            UPDATE "threads" t
            SET "lastActivityAt" = COALESCE(
                (SELECT MAX(m."createdAt") FROM "messages" m WHERE m."threadId" = t."id"),
                t."createdAt"
            )
            WHERE t."lastActivityAt" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75bb0778b90741be9a49adfc24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "lastActivityAt"`,
    );
  }
}
