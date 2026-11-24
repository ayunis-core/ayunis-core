import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { OparlTextObject } from 'src/domain/oparl/application/models/oparl-document';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';

// Council information systems are German; a meeting's day is its local one.
const LOCAL_DAY = (timestamp: string) =>
  `(${timestamp} AT TIME ZONE 'Europe/Berlin')::date`;

/** Of the file metadata the content depends on; a change makes the file pending again. */
export const FILE_FINGERPRINT = `md5(concat_ws('|',
  coalesce(f."accessUrl", ''), coalesce(f."downloadUrl", ''),
  coalesce(f."size"::text, ''), coalesce(f."sha1Checksum", ''),
  coalesce(f."sha512Checksum", ''), coalesce(f."mimeType", ''),
  coalesce(extract(epoch FROM f."oparlModified")::text, '')))`;

const PENDING_FILE_COLUMNS = `f.id, f."bodyId", f.name, f."fileName", f."mimeType",
  f."accessUrl", f."downloadUrl", f.size`;

/**
 * Files of a system ($1) to read, newest first, at most $4, without the
 * files $5; failed ones under $2 attempts read before $3.
 */
export const PENDING_FILES_SQL = `
  SELECT ${PENDING_FILE_COLUMNS}, ${FILE_FINGERPRINT} AS fingerprint,
         t.status, t."contentHash"
  FROM oparl_files f
  LEFT JOIN oparl_file_texts t ON t."fileId" = f.id
  WHERE f."systemId" = $1
    AND NOT (f.id = ANY($5::text[]))
    AND (t."fileId" IS NULL
      OR t."sourceFingerprint" <> ${FILE_FINGERPRINT}
      OR (t.status = 'failed' AND t.attempts < $2 AND t."readAt" < $3))
  ORDER BY f.date DESC NULLS LAST, f.id
  LIMIT $4`;

/** Extracted files of a system ($1) that lost their chunks. */
export const FILES_WITHOUT_CHUNKS_SQL = `
  SELECT ${PENDING_FILE_COLUMNS}, t."sourceFingerprint" AS fingerprint,
         t.status, t."contentHash", t.pages
  FROM oparl_file_texts t
  JOIN oparl_files f ON f.id = t."fileId"
  WHERE f."systemId" = $1 AND t.status = 'extracted' AND t."chunkCount" > 0
    AND NOT EXISTS (SELECT 1 FROM oparl_chunks c WHERE c."fileId" = f.id)
  LIMIT $2`;

/**
 * Upserts a file's text ($1 file, $2 status, $3 reason, $4 error, $5 hash,
 * $6 page count, $7 pages, $8 chunk count, $9 fingerprint). A failure keeps
 * the text read before; failures are counted per fingerprint.
 */
export const SAVE_FILE_TEXT_SQL = `
  INSERT INTO oparl_file_texts AS t ("fileId", status, "skipReason", error,
    "contentHash", "pageCount", pages, "chunkCount", "sourceFingerprint",
    attempts, "readAt")
  SELECT f.id, $2::oparl_file_texts_status_enum,
         $3::oparl_file_texts_skipreason_enum, $4::text, $5::text, $6::integer,
         $7::jsonb, $8::integer, $9::text,
         CASE WHEN $2::text = 'failed' THEN 1 ELSE 0 END, now()
  FROM oparl_files f WHERE f.id = $1
  ON CONFLICT ("fileId") DO UPDATE SET
    status = EXCLUDED.status,
    "skipReason" = EXCLUDED."skipReason",
    error = EXCLUDED.error,
    "contentHash" = CASE WHEN EXCLUDED.status = 'failed' THEN t."contentHash" ELSE EXCLUDED."contentHash" END,
    "pageCount" = CASE WHEN EXCLUDED.status = 'failed' THEN t."pageCount" ELSE EXCLUDED."pageCount" END,
    pages = CASE WHEN EXCLUDED.status = 'failed' THEN t.pages ELSE EXCLUDED.pages END,
    "chunkCount" = CASE WHEN EXCLUDED.status = 'failed' THEN t."chunkCount" ELSE EXCLUDED."chunkCount" END,
    "sourceFingerprint" = EXCLUDED."sourceFingerprint",
    attempts = CASE
      WHEN EXCLUDED.status <> 'failed' THEN 0
      WHEN t."sourceFingerprint" = EXCLUDED."sourceFingerprint" THEN t.attempts + 1
      ELSE 1 END,
    "readAt" = now()
  RETURNING "fileId"`;

export const CONFIRM_FILE_TEXT_SQL = `
  UPDATE oparl_file_texts
  SET "sourceFingerprint" = $2, attempts = 0, "readAt" = now()
  WHERE "fileId" = $1`;

/** Chunks from JSON rows ($1). */
export const INSERT_CHUNKS_SQL = `
  INSERT INTO oparl_chunks (id, "bodyId", source, "paperId", "meetingId",
    "agendaItemId", "fileId", date, "pageNumber", ordinal, text, "sourceHash")
  SELECT c.id, c."bodyId", c.source::oparl_chunks_source_enum, c."paperId",
         c."meetingId", c."agendaItemId", c."fileId", c.date, c."pageNumber",
         c.ordinal, c.text, c."sourceHash"
  FROM jsonb_to_recordset($1::jsonb) AS c(id text, "bodyId" text, source text,
    "paperId" text, "meetingId" text, "agendaItemId" text, "fileId" text,
    date date, "pageNumber" integer, ordinal integer, text text,
    "sourceHash" text)`;

/**
 * Where the files `filter` selects belong: the
 * agenda item it is the resolution or an attachment of, the paper it is the
 * main file or an attachment of (or the agenda item's consultation's), the
 * meeting it is the invitation, protocol or an attachment of (or the agenda
 * item's), and its date, else the paper's or the meeting's day. The first
 * by rank, then ID, so the answer is stable.
 */
const fileContextSql = (filter: string) => `
  SELECT f.id AS "fileId", pp.id AS "paperId", ai.id AS "agendaItemId",
         coalesce(ai."meetingId", mm.id) AS "meetingId",
         coalesce(f.date, pp.date, ${LOCAL_DAY('coalesce(am.start, mm.start)')}) AS date
  FROM oparl_files f
  LEFT JOIN LATERAL (
    SELECT a.id, a."meetingId", a."consultationId" FROM (
      SELECT 0 AS rank, a.id FROM oparl_agenda_items a WHERE a."resolutionFileId" = f.id
      UNION ALL
      SELECT 1, j."ownerId" FROM oparl_agenda_item_auxiliary_files j WHERE j."targetId" = f.id
    ) x JOIN oparl_agenda_items a ON a.id = x.id
    ORDER BY x.rank, a.id LIMIT 1
  ) ai ON true
  LEFT JOIN oparl_meetings am ON am.id = ai."meetingId"
  LEFT JOIN LATERAL (
    SELECT p.id, p.date FROM (
      SELECT 0 AS rank, p.id FROM oparl_papers p WHERE p."mainFileId" = f.id
      UNION ALL
      SELECT 1, j."ownerId" FROM oparl_paper_auxiliary_files j WHERE j."targetId" = f.id
      UNION ALL
      SELECT 2, c."paperId" FROM oparl_consultations c WHERE c.id = ai."consultationId"
    ) x JOIN oparl_papers p ON p.id = x.id
    ORDER BY x.rank, p.id LIMIT 1
  ) pp ON true
  LEFT JOIN LATERAL (
    SELECT m.id, m.start FROM (
      SELECT 0 AS rank, m.id FROM oparl_meetings m WHERE m."invitationId" = f.id
      UNION ALL
      SELECT 0, m.id FROM oparl_meetings m WHERE m."resultsProtocolId" = f.id
      UNION ALL
      SELECT 0, m.id FROM oparl_meetings m WHERE m."verbatimProtocolId" = f.id
      UNION ALL
      SELECT 1, j."ownerId" FROM oparl_meeting_auxiliary_files j WHERE j."targetId" = f.id
    ) x JOIN oparl_meetings m ON m.id = x.id
    ORDER BY x.rank, m.id LIMIT 1
  ) mm ON true
  WHERE ${filter}`;

// Two statements rather than one with optional filters, so each keeps its
// own plan (a generic plan for both would scan every file).
const refreshFileContextSql = (filter: string) => `
  WITH ctx AS (${fileContextSql(filter)})
  UPDATE oparl_chunks c
  SET "paperId" = ctx."paperId", "meetingId" = ctx."meetingId",
      "agendaItemId" = ctx."agendaItemId", date = ctx.date
  FROM ctx
  WHERE c."fileId" = ctx."fileId"
    AND (c."paperId", c."meetingId", c."agendaItemId", c.date)
      IS DISTINCT FROM (ctx."paperId", ctx."meetingId", ctx."agendaItemId", ctx.date)`;

/** For the files of a system ($1). */
export const REFRESH_SYSTEM_FILE_CONTEXT_SQL =
  refreshFileContextSql(`f."systemId" = $1`);

/** For the files $1. */
export const REFRESH_FILES_CONTEXT_SQL =
  refreshFileContextSql(`f.id = ANY($1)`);

const chunkedHash = (column: string, source: OparlChunkSource) =>
  `(SELECT c."sourceHash" FROM oparl_chunks c WHERE c."${column}" = o.id AND c.source = '${source}' LIMIT 1) AS "chunkedHash"`;

const TEXT_OBJECT_QUERIES: Record<OparlTextObject['source'], string> = {
  [OparlChunkSource.PAPER]: `
    SELECT o.id, o."bodyId", NULL AS "meetingId", o.date::text AS date,
           ARRAY[o.reference, o.name, o."paperType"] AS parts,
           ${chunkedHash('paperId', OparlChunkSource.PAPER)}
    FROM oparl_papers o`,
  [OparlChunkSource.MEETING]: `
    SELECT o.id, o."bodyId", NULL AS "meetingId",
           ${LOCAL_DAY('o.start')}::text AS date, ARRAY[o.name] AS parts,
           ${chunkedHash('meetingId', OparlChunkSource.MEETING)}
    FROM oparl_meetings o`,
  [OparlChunkSource.AGENDA_ITEM]: `
    SELECT o.id, o."bodyId", o."meetingId",
           ${LOCAL_DAY('coalesce(o.start, m.start)')}::text AS date,
           ARRAY[nullif(concat_ws(' ', o.number, o.name), ''), o.result, o."resolutionText"] AS parts,
           ${chunkedHash('agendaItemId', OparlChunkSource.AGENDA_ITEM)}
    FROM oparl_agenda_items o
    LEFT JOIN oparl_meetings m ON m.id = o."meetingId"`,
};

/** Objects of a system ($1) after ID $2, by ID, at most $3. */
export function textObjectsSql(source: OparlTextObject['source']): string {
  return `${TEXT_OBJECT_QUERIES[source]}
    WHERE o."systemId" = $1 AND ($2::text IS NULL OR o.id > $2)
    ORDER BY o.id LIMIT $3`;
}

export const OWNER_COLUMNS: Record<OparlTextObject['source'], string> = {
  [OparlChunkSource.PAPER]: 'paperId',
  [OparlChunkSource.MEETING]: 'meetingId',
  [OparlChunkSource.AGENDA_ITEM]: 'agendaItemId',
};

/** Chunks of a body ($1) after ID $2 without a vector of model $3, by ID, at most $4. */
export const CHUNKS_TO_EMBED_SQL = `
  SELECT id, text FROM oparl_chunks
  WHERE "bodyId" = $1 AND ($2::text IS NULL OR id > $2)
    AND "embeddingModelId" IS DISTINCT FROM $3::text
  ORDER BY id LIMIT $4`;

const EMBEDDING_COLUMNS: Record<EmbeddingDimensions, string> = {
  [EmbeddingDimensions.DIMENSION_1024]: 'embedding1024',
  [EmbeddingDimensions.DIMENSION_1536]: 'embedding1536',
  [EmbeddingDimensions.DIMENSION_2560]: 'embedding2560',
};

/** Vectors ($2 IDs, $3 vectors as text) of model $1, in the column of their dimensions. */
export function saveEmbeddingsSql(dimensions: EmbeddingDimensions): string {
  const assignments = Object.entries(EMBEDDING_COLUMNS).map(([dims, column]) =>
    Number(dims) === Number(dimensions)
      ? `"${column}" = v.vector::halfvec(${dims})`
      : `"${column}" = NULL`,
  );
  return `
    UPDATE oparl_chunks c
    SET "embeddingModelId" = $1::text, ${assignments.join(', ')}
    FROM unnest($2::text[], $3::text[]) AS v(id, vector)
    WHERE c.id = v.id`;
}

export const HAS_VECTORS_OF_MODEL_SQL = `
  SELECT EXISTS (SELECT 1 FROM oparl_chunks WHERE "embeddingModelId" = $1::text) AS "exists"`;

/**
 * Systems with files not read as of their current metadata, or chunks
 * without a vector of model $1 (when given).
 */
export const SYSTEMS_WITH_DOCUMENT_WORK_SQL = `
  SELECT s.id FROM oparl_systems s
  WHERE EXISTS (
      SELECT 1 FROM oparl_files f
      LEFT JOIN oparl_file_texts t ON t."fileId" = f.id
      WHERE f."systemId" = s.id
        AND (t."fileId" IS NULL OR t."sourceFingerprint" <> ${FILE_FINGERPRINT}))
    OR ($1::text IS NOT NULL AND EXISTS (
      SELECT 1 FROM oparl_chunks c
      JOIN oparl_bodies b ON b.id = c."bodyId"
      WHERE b."systemId" = s.id
        AND c."embeddingModelId" IS DISTINCT FROM $1::text))`;

/** Per system ($1): files by where their text stands, as of their current metadata. */
export const FILE_STATS_SQL = `
  SELECT f."systemId",
    count(*)::int AS total,
    count(*) FILTER (WHERE s.state = 'pending')::int AS pending,
    count(*) FILTER (WHERE s.state = 'extracted')::int AS extracted,
    count(*) FILTER (WHERE s.state = 'failed')::int AS failed,
    count(*) FILTER (WHERE s.state = 'skipped' AND t."skipReason" = 'too_large')::int AS too_large,
    count(*) FILTER (WHERE s.state = 'skipped' AND t."skipReason" = 'too_many_pages')::int AS too_many_pages,
    count(*) FILTER (WHERE s.state = 'skipped' AND t."skipReason" = 'unsupported_type')::int AS unsupported_type,
    count(*) FILTER (WHERE s.state = 'skipped' AND t."skipReason" = 'unreadable')::int AS unreadable
  FROM oparl_files f
  LEFT JOIN oparl_file_texts t ON t."fileId" = f.id
  CROSS JOIN LATERAL (SELECT CASE
    WHEN t."fileId" IS NULL OR t."sourceFingerprint" <> ${FILE_FINGERPRINT} THEN 'pending'
    ELSE t.status::text END AS state) s
  WHERE f."systemId" = ANY($1)
  GROUP BY f."systemId"`;

export const LAST_FILE_ERRORS_SQL = `
  SELECT DISTINCT ON (f."systemId") f."systemId", t.error
  FROM oparl_file_texts t
  JOIN oparl_files f ON f.id = t."fileId"
  WHERE f."systemId" = ANY($1) AND t.status = 'failed'
  ORDER BY f."systemId", t."readAt" DESC`;

/** Per system ($1): chunks, and those with a vector of model $2. */
export const INDEX_STATS_SQL = `
  SELECT b."systemId", count(c.id)::int AS chunks,
         count(c.id) FILTER (WHERE c."embeddingModelId" = $2::text)::int AS embedded
  FROM oparl_chunks c
  JOIN oparl_bodies b ON b.id = c."bodyId"
  WHERE b."systemId" = ANY($1)
  GROUP BY b."systemId"`;
