# Child-chunk search indexes (v2.83.1)

v2.83.1 adds two migrations for document search (AYC-2053):

- `AddRelatedDocumentIdToChildChunks1795470331058` adds `child_chunks."relatedDocumentId"`, fills it from `parent_chunks`, and indexes it with B-tree `IDX_010d0425e18fa71b492aa9b05c` (AYC-2055).
- `AddHnswIndexesToChildChunks1795480080226` adds one partial HNSW index per embedding column, `IDX_child_chunks_embedding_{1024,1536,2560}_hnsw`, on the vectors cast to `halfvec` (AYC-2056).

Both migrations are idempotent, and on a small database they finish at startup in seconds. On a large one they would hold up startup and block writes to `child_chunks` for a long time: all migrations run in one transaction, so they cannot use `CREATE INDEX CONCURRENTLY`. Measured times:

- the HNSW build inside the migration took 17 min for 613k vectors on a laptop;
- the manual HNSW build below took 2 h 9 min for 5.5M vectors on Ayunis production.

**Run this runbook before upgrading to v2.83.1 when `child_chunks` holds more than about 100,000 rows.** The deploy's migrations then find the work done: they check the catalog, take no lock, and only fill the rows written in between.

Check the size:

```sql
SELECT reltuples::bigint AS child_chunks FROM pg_class WHERE relname = 'child_chunks';
```

## Before you start

- **Version:** the database still runs the version before v2.83.1. The app keeps serving traffic throughout; nothing needs to be stopped.
- **When:** outside working hours. The HNSW build reads every vector in the table and holds a large part of Postgres's memory, so searches are slower while it runs.
- **Session:** run `psql` inside `tmux` or `screen` on the database host. A dropped connection cancels a running build. Example for the bundled Compose setup:

  ```bash
  docker exec -it <postgres-container> sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ```

- **Autocommit:** keep psql's default autocommit. `CREATE INDEX CONCURRENTLY` cannot run in a transaction block, and part 1 commits per batch.
- **Memory for part 2:** size `maintenance_work_mem` to hold the HNSW graph.
  - The index takes about 2.2 KB per 1024-dim vector, about 3.2 KB per 1536-dim vector, and about 5.2 KB per 2560-dim vector (estimate).
  - The setting plus `shared_buffers` must fit within Postgres's memory limit.
  - The build is serial (`max_parallel_maintenance_workers = 0`): a parallel build keeps the whole graph in `/dev/shm`. Docker caps that at 64 MB unless `shm_size` is set, and the build fails as soon as the graph outgrows it.
- **Free disk:** at least the expected index size plus a few GB of WAL.

## Part 1: document column and B-tree index (AYC-2055)

On Ayunis production (5.5M rows) this took 17 min: 14 min for the backfill, 18 s for the index, 2 min 40 s for the `VACUUM`.

```sql
\set ON_ERROR_STOP on
\timing on
SET statement_timeout = 0;

-- Step 1: add the column. Metadata only, but it needs a short exclusive lock on
-- child_chunks; give up after 5 s instead of queueing every query behind a long
-- search. If it times out, just run it again.
SET lock_timeout = '5s';
ALTER TABLE child_chunks ADD COLUMN IF NOT EXISTS "relatedDocumentId" character varying;
RESET lock_timeout;

-- Step 2: statistics for the new column, so the planner knows it is NULL everywhere
-- and drives each batch below from the parentId index.
ANALYZE child_chunks;

-- Step 3: backfill in batches of 5,000 parent chunks (~14k child rows), one
-- transaction each, so row locks stay short. Safe to abort and run again: it
-- only touches rows that are still NULL.
DO $$
DECLARE
  last_id varchar := '';
  batch varchar[];
  updated bigint;
  total bigint := 0;
  batches int := 0;
BEGIN
  LOOP
    SELECT array_agg(id ORDER BY id) INTO batch
    FROM (SELECT id FROM parent_chunks WHERE id > last_id ORDER BY id LIMIT 5000) s;
    EXIT WHEN batch IS NULL;
    EXECUTE 'UPDATE child_chunks c SET "relatedDocumentId" = p."relatedDocumentId"
             FROM parent_chunks p
             WHERE c."parentId" = ANY($1) AND p.id = c."parentId" AND c."relatedDocumentId" IS NULL'
      USING batch;
    GET DIAGNOSTICS updated = ROW_COUNT;
    total := total + updated;
    batches := batches + 1;
    last_id := batch[array_upper(batch, 1)];
    COMMIT;
    IF batches % 50 = 0 THEN
      RAISE NOTICE '% batches, % child chunks filled so far', batches, total;
    END IF;
  END LOOP;
  RAISE NOTICE 'done: % batches, % child chunks filled', batches, total;
END $$;

-- Step 4: the index, without blocking writes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_010d0425e18fa71b492aa9b05c" ON child_chunks ("relatedDocumentId");

-- Step 5: must return t. If it returns f (the build was aborted), run
--   DROP INDEX CONCURRENTLY "IDX_010d0425e18fa71b492aa9b05c";
-- and repeat step 4.
SELECT indisvalid FROM pg_index WHERE indexrelid = '"IDX_010d0425e18fa71b492aa9b05c"'::regclass;

-- Step 6: statistics for the filled column; clean up the rows the backfill replaced.
VACUUM (ANALYZE) child_chunks;

-- Step 7: rows the running version wrote since step 3. The migration fills them at deploy.
SELECT count(*) AS still_null FROM child_chunks WHERE "relatedDocumentId" IS NULL;
```

## Part 2: HNSW indexes (AYC-2056)

The build time is dominated by the column that holds your vectors; the empty columns take seconds. On Ayunis production the 1024 index took 2 h 9 min for 5.5M vectors (12 GB index), with Postgres at 32 GB and 8 CPUs and `maintenance_work_mem = 16GB`. The rate fell from about 60k to about 30k vectors per minute as the graph grew. On Ayunis Internal, 34k 1536-dim vectors took 12 s.

```sql
\set ON_ERROR_STOP on
\timing on

-- Step 0: preconditions.
SHOW shared_buffers;
SELECT extversion FROM pg_extension WHERE extname = 'vector';   -- >= 0.7.0 (halfvec)
SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname LIKE 'IDX_child_chunks_embedding_%_hnsw';        -- expect 0 rows; for an f row see "If a build is aborted"

-- Step 1: session settings. Size maintenance_work_mem to the expected index
-- (see "Before you start"); 16GB was right for 5.5M 1024-dim vectors.
SET statement_timeout = 0;
SET maintenance_work_mem = '16GB';
SET max_parallel_maintenance_workers = 0;

-- Step 2: one index per embedding column. The ones whose column is empty take seconds.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_child_chunks_embedding_1536_hnsw" ON child_chunks
  USING hnsw ((embedding_1536::halfvec(1536)) halfvec_cosine_ops) WHERE embedding_1536 IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_child_chunks_embedding_2560_hnsw" ON child_chunks
  USING hnsw ((embedding_2560::halfvec(2560)) halfvec_cosine_ops) WHERE embedding_2560 IS NOT NULL;
-- If this prints
--   NOTICE: hnsw graph no longer fits into maintenance_work_mem after N tuples
-- the build continues on disk and takes much longer.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_child_chunks_embedding_1024_hnsw" ON child_chunks
  USING hnsw ((embedding_1024::halfvec(1024)) halfvec_cosine_ops) WHERE embedding_1024 IS NOT NULL;

-- Step 3: all three must be t. IF NOT EXISTS silently skips an INVALID index of the
-- same name, so this check is not optional. Keep the oids for the checks after the upgrade.
SELECT c.relname, c.oid, i.indisvalid, pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname LIKE 'IDX_child_chunks_embedding_%_hnsw' ORDER BY 1;
```

**Watching progress** from a second session:

```sql
SELECT p.pid, p.phase, p.blocks_done, p.blocks_total, p.tuples_done,
       round(100.0 * p.blocks_done / nullif(p.blocks_total, 0), 1) AS pct,
       now() - a.query_start AS running
FROM pg_stat_progress_create_index p JOIN pg_stat_activity a USING (pid);
```

Most of the time is spent in `building index: loading tuples`. The later phases add the rows written during the build and wait for running transactions.

**If a build is aborted** (Ctrl-C, lost connection, error), it leaves an INVALID index behind. Drop it without blocking writes, then repeat step 1 and the build for that column:

```sql
DROP INDEX CONCURRENTLY IF EXISTS "IDX_child_chunks_embedding_1024_hnsw";
```

From the moment an HNSW index exists, every new chunk also updates it, so ingestion gets somewhat slower even before the upgrade.

## Upgrade

Deploy v2.83.1 as usual. The migrations only read the catalog and fill the rows counted in part 1 step 7.

## After the upgrade

1. **Rows without a document:** must be 0. Ingestion workers still on the old image can write chunks after the new app has migrated. Fill those rows with:

   ```sql
   SELECT count(*) FROM child_chunks WHERE "relatedDocumentId" IS NULL;

   UPDATE child_chunks c SET "relatedDocumentId" = p."relatedDocumentId"
   FROM parent_chunks p
   WHERE p.id = c."parentId" AND c."relatedDocumentId" IS NULL;
   ```

   On Ayunis production, 123 such rows were filled in 0.5 s. Search skips chunks without a document until they are filled.
2. **Indexes:** part 2 step 3 again. All rows must be `t`, with the oids from before the upgrade. Changed oids mean the migration rebuilt an index.
3. **Migrations recorded:**

   ```sql
   SELECT name FROM migrations WHERE name LIKE '%ChildChunks%';
   ```

   Both migrations must be listed.
4. **Logs:** no new `Vector search failed` errors in the app logs.
