import type { MigrationInterface, QueryRunner } from 'typeorm';

const INDEX = 'IDX_010d0425e18fa71b492aa9b05c';

// On production the column, the backfill and the index are created by hand
// before the deploy (runbook in the PR of AYC-2055), with batched updates and
// CREATE INDEX CONCURRENTLY, which a migration cannot run: migrations share
// one transaction. Every step here is therefore idempotent, so on production
// it only fills rows written between the runbook and the deploy, and on every
// other database it does the whole job.
export class AddRelatedDocumentIdToChildChunks1795470331058 implements MigrationInterface {
  name = 'AddRelatedDocumentIdToChildChunks1795470331058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The app's statement_timeout would abort the backfill of a large
    // self-hosted install at startup; restored for the migrations after this.
    const [{ timeout }] = (await queryRunner.query(
      `SELECT current_setting('statement_timeout') AS timeout`,
    )) as { timeout: string }[];
    await queryRunner.query(`SET LOCAL statement_timeout = 0`);

    // Catalog checks instead of IF NOT EXISTS: ALTER TABLE and CREATE INDEX
    // lock child_chunks before they find there is nothing to do, and the
    // migrations' transaction would hold that lock until it commits.
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = current_schema() AND table_name = 'child_chunks' AND column_name = 'relatedDocumentId'
         ) THEN
           ALTER TABLE "child_chunks" ADD "relatedDocumentId" character varying;
         END IF;
       END $$`,
    );
    await queryRunner.query(
      `UPDATE "child_chunks" "child" SET "relatedDocumentId" = "parent"."relatedDocumentId"
       FROM "parent_chunks" "parent"
       WHERE "parent"."id" = "child"."parentId" AND "child"."relatedDocumentId" IS NULL`,
    );
    // An aborted CREATE INDEX CONCURRENTLY leaves an INVALID index behind
    // that no query can use; it is rebuilt rather than kept.
    await queryRunner.query(
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('"${INDEX}"') AND NOT indisvalid) THEN
           DROP INDEX "${INDEX}";
         END IF;
         IF to_regclass('"${INDEX}"') IS NULL THEN
           CREATE INDEX "${INDEX}" ON "child_chunks" ("relatedDocumentId");
         END IF;
       END $$`,
    );

    await queryRunner.query(
      `SELECT set_config('statement_timeout', $1, true)`,
      [timeout],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."${INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP COLUMN "relatedDocumentId"`,
    );
  }
}
