import type { MigrationInterface, QueryRunner } from 'typeorm';

const DIMENSIONS = [1024, 1536, 2560];

const indexName = (dimensions: number) =>
  `IDX_child_chunks_embedding_${dimensions}_hnsw`;

// On production the indexes are built by hand before the deploy
// (docs/runbooks/child-chunk-search-indexes.md) with CREATE INDEX
// CONCURRENTLY, which a migration cannot run: migrations share one
// transaction. Every step here is therefore idempotent: on production it does
// nothing, on every other database it builds the indexes, which blocks writes
// to child_chunks while it runs.
export class AddHnswIndexesToChildChunks1795480080226 implements MigrationInterface {
  name = 'AddHnswIndexesToChildChunks1795480080226';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [settings] = (await queryRunner.query(
      `SELECT current_setting('statement_timeout') AS timeout,
              current_setting('max_parallel_maintenance_workers') AS workers`,
    )) as { timeout: string; workers: string }[];
    // The app's statement_timeout would abort the build on a large
    // self-hosted install at startup. A parallel HNSW build keeps its graph
    // in /dev/shm, which Docker caps at 64 MB unless shm_size is set, and
    // fails when the graph outgrows it; a serial build keeps it in local
    // memory. Both are restored for the migrations after this one.
    await queryRunner.query(`SET LOCAL statement_timeout = 0`);
    await queryRunner.query(`SET LOCAL max_parallel_maintenance_workers = 0`);

    for (const dimensions of DIMENSIONS) {
      await queryRunner.query(this.createIndexIfMissing(dimensions));
    }

    await queryRunner.query(
      `SELECT set_config('statement_timeout', $1, true),
              set_config('max_parallel_maintenance_workers', $2, true)`,
      [settings.timeout, settings.workers],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const dimensions of DIMENSIONS) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."${indexName(dimensions)}"`,
      );
    }
  }

  // Catalog checks instead of IF NOT EXISTS: CREATE INDEX locks child_chunks
  // before it finds the index exists, and the migrations' transaction would
  // hold that lock until it commits. An aborted CREATE INDEX CONCURRENTLY
  // leaves an INVALID index behind that no query uses; it is rebuilt rather
  // than kept.
  private createIndexIfMissing(dimensions: number): string {
    const name = indexName(dimensions);
    const column = `embedding_${dimensions}`;
    return `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('"${name}"') AND NOT indisvalid) THEN
        DROP INDEX "${name}";
      END IF;
      IF to_regclass('"${name}"') IS NULL THEN
        CREATE INDEX "${name}" ON "child_chunks"
          USING hnsw (("${column}"::halfvec(${dimensions})) halfvec_cosine_ops)
          WHERE "${column}" IS NOT NULL;
      END IF;
    END $$`;
  }
}
