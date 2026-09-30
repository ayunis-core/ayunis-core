import type { EntityManager } from 'typeorm';
import type { DueSourceReindex } from 'src/domain/sources/application/models/due-source-reindex';

/**
 * One statement: the CTE locks up to `limit` due rows, skipping any a
 * concurrent claimer holds, and the UPDATE moves them one interval past now()
 * before the locks are released. A claimer that read a row before another
 * committed its move re-checks the due condition on the new row version and
 * drops it, so no source is claimed twice. The new due date is stored at
 * millisecond precision so it round-trips through a JS Date exactly, which
 * `releaseReindexClaim` compares against.
 */
export async function claimDueReindexes(
  manager: EntityManager,
  limit: number,
): Promise<DueSourceReindex[]> {
  // TypeORM returns an UPDATE's result as [rows, affected count].
  const [rows] = await manager.query<[DueSourceReindex[], number]>(
    `WITH due AS (
       SELECT s.id, s."nextReindexAt", kb."orgId",
              COALESCE(s."textType"::text, s."dataType"::text) AS subtype
         FROM sources s
         JOIN knowledge_bases kb ON kb.id = s."knowledgeBaseId"
        WHERE s."nextReindexAt" <= now()
        ORDER BY s."nextReindexAt"
        LIMIT $1
          FOR UPDATE OF s SKIP LOCKED
     )
     UPDATE sources s
        SET "nextReindexAt" = date_trunc('milliseconds', now()) + CASE s."reindexIntervalUnit"
              WHEN 'weeks' THEN make_interval(weeks => s."reindexIntervalValue")
              ELSE make_interval(months => s."reindexIntervalValue")
            END
       FROM due
      WHERE s.id = due.id
     RETURNING s.id AS "sourceId", due."orgId", due.subtype,
               due."nextReindexAt" AS "dueAt", s."nextReindexAt" AS "nextDueAt"`,
    [limit],
  );
  return rows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
