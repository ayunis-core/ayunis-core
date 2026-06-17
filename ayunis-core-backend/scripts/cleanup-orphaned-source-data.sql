-- Cleanup orphaned source data
-- Run after deploying source lifecycle fixes.
-- Safe to run multiple times (idempotent).

BEGIN;

-- 1. Report orphaned vector index entries (parent_chunks with no matching source)
SELECT count(*) AS orphaned_parent_chunks
FROM parent_chunks pc
LEFT JOIN sources s ON pc."relatedDocumentId" = s.id::text
WHERE s.id IS NULL;

-- 2. Report zombie source records (text sources marked ready but missing details row)
SELECT count(*) AS zombie_text_sources
FROM sources s
LEFT JOIN text_source_details_record d ON s.id = d."sourceId"
WHERE s.status = 'ready'
  AND s.type = 'text'
  AND d.id IS NULL;

-- 3. Delete orphaned vector index entries
DELETE FROM parent_chunks
WHERE "relatedDocumentId" NOT IN (SELECT id::text FROM sources);

-- 4. Delete zombie source records
DELETE FROM sources
WHERE id IN (
  SELECT s.id
  FROM sources s
  LEFT JOIN text_source_details_record d ON s.id = d."sourceId"
  WHERE s.status = 'ready'
    AND s.type = 'text'
    AND d.id IS NULL
);

COMMIT;
