import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  OparlListType,
  type OparlListFilters,
} from 'src/domain/oparl/application/models/oparl-read';
import type {
  OparlQueryVector,
  OparlReadScope,
  OparlSearchFilters,
} from 'src/domain/oparl/application/models/oparl-search';

/** Collects positional parameters while a statement is built. */
export class SqlParams {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

export interface SqlStatement {
  sql: string;
  params: unknown[];
}

const EMBEDDING_COLUMNS: Record<EmbeddingDimensions, string> = {
  [EmbeddingDimensions.DIMENSION_1024]: 'embedding1024',
  [EmbeddingDimensions.DIMENSION_1536]: 'embedding1536',
  [EmbeddingDimensions.DIMENSION_2560]: 'embedding2560',
};

export const PERSON_NAME = (alias: string) =>
  `coalesce(${alias}.name, nullif(concat_ws(' ', ${alias}."givenName", ${alias}."familyName"), ''))`;

export const ISO = (expression: string) => `to_json(${expression}) #>> '{}'`;

const BODY_JSON = `json_build_object('id', b.id, 'name', b.name)`;

/** A LIKE pattern matching the text anywhere, with its wildcards taken literally. */
export function containsPattern(text: string): string {
  const literal = text.replace(/[\\%_]/g, (char) => '\\' + char);
  return `%${literal}%`;
}

// A consultation may name only its agenda item, whose meeting it is then.
const ORGANIZATION_PAPERS = (org: string) => `
  SELECT po."ownerId" FROM oparl_paper_originator_organizations po WHERE po."targetId" = ${org}
  UNION SELECT k."paperId" FROM oparl_consultations k
    JOIN oparl_consultation_organizations ko ON ko."ownerId" = k.id
    WHERE ko."targetId" = ${org}
  UNION SELECT k."paperId" FROM oparl_consultations k
    LEFT JOIN oparl_agenda_items ka ON ka.id = k."agendaItemId"
    JOIN oparl_meeting_organizations mo ON mo."ownerId" = coalesce(k."meetingId", ka."meetingId")
    WHERE mo."targetId" = ${org}`;

/**
 * The paper an agenda item (`a`) deliberates: the consultation it names, or
 * else one that names it (a RIS may fill in only one of the two references).
 */
export const AGENDA_ITEM_PAPER = `LEFT JOIN LATERAL (
    SELECT k."paperId" FROM oparl_consultations k
    WHERE k.id = a."consultationId" OR k."agendaItemId" = a.id
    ORDER BY k.id = a."consultationId" DESC NULLS LAST, k.id LIMIT 1) ak ON true`;

const AGENDA_ITEMS_OF_PAPERS = (papers: string) => `
  SELECT k."agendaItemId" FROM oparl_consultations k
    WHERE k."paperId" IN (${papers}) AND k."agendaItemId" IS NOT NULL
  UNION SELECT a.id FROM oparl_agenda_items a
    JOIN oparl_consultations k ON k.id = a."consultationId"
    WHERE k."paperId" IN (${papers})`;

/** The filter's organization or person ($id) is itself of a body in the scope. */
const TARGET_IN_SCOPE = (table: string, id: string, bodies: string) =>
  `EXISTS (SELECT 1 FROM ${table} t WHERE t.id = ${id} AND t."bodyId" = ANY(${bodies}::varchar[]))`;

type ChunkFilter = (
  filters: OparlSearchFilters,
  params: SqlParams,
  bodies: string,
) => string[];

const dateConditions: ChunkFilter = (filters, params) => [
  ...(filters.from ? [`c.date >= ${params.add(filters.from)}::date`] : []),
  ...(filters.to ? [`c.date <= ${params.add(filters.to)}::date`] : []),
];

const sourceConditions: ChunkFilter = (filters, params) =>
  filters.sources
    ? [`c.source::text = ANY(${params.add(filters.sources)}::text[])`]
    : [];

const paperTypeConditions: ChunkFilter = (filters, params, bodies) => {
  if (!filters.paperType) return [];
  const type = params.add(containsPattern(filters.paperType));
  const papers = `SELECT p.id FROM oparl_papers p
    WHERE p."bodyId" = ANY(${bodies}::varchar[]) AND p."paperType" ILIKE ${type}`;
  return [
    `(c."paperId" IN (${papers})
    OR c."agendaItemId" IN (${AGENDA_ITEMS_OF_PAPERS(papers)}))`,
  ];
};

const organizationConditions: ChunkFilter = (filters, params, bodies) => {
  if (!filters.organizationId) return [];
  const org = params.add(filters.organizationId);
  return [
    TARGET_IN_SCOPE('oparl_organizations', org, bodies),
    `(c."meetingId" IN (SELECT mo."ownerId" FROM oparl_meeting_organizations mo WHERE mo."targetId" = ${org})
    OR c."paperId" IN (${ORGANIZATION_PAPERS(org)}))`,
  ];
};

const personConditions: ChunkFilter = (filters, params, bodies) => {
  if (!filters.personId) return [];
  const person = params.add(filters.personId);
  return [
    TARGET_IN_SCOPE('oparl_persons', person, bodies),
    `(c."paperId" IN (SELECT "ownerId" FROM oparl_paper_originator_persons WHERE "targetId" = ${person})
    OR c."meetingId" IN (SELECT "ownerId" FROM oparl_meeting_participants WHERE "targetId" = ${person}))`,
  ];
};

/** The meeting's ($m) invitation, protocols and attachments, and those of its agenda items. */
const MEETING_FILES = (meeting: string) => `
  SELECT unnest(ARRAY[m."invitationId", m."resultsProtocolId", m."verbatimProtocolId"])
    FROM oparl_meetings m WHERE m.id = ${meeting}
  UNION SELECT j."targetId" FROM oparl_meeting_auxiliary_files j WHERE j."ownerId" = ${meeting}
  UNION SELECT a."resolutionFileId" FROM oparl_agenda_items a WHERE a."meetingId" = ${meeting}
  UNION SELECT j."targetId" FROM oparl_agenda_item_auxiliary_files j
    JOIN oparl_agenda_items a ON a.id = j."ownerId" WHERE a."meetingId" = ${meeting}`;

/** The paper's ($p) main file and attachments, and those of the agenda items deliberating it. */
const PAPER_FILES = (paper: string) => `
  SELECT p."mainFileId" FROM oparl_papers p WHERE p.id = ${paper}
  UNION SELECT j."targetId" FROM oparl_paper_auxiliary_files j WHERE j."ownerId" = ${paper}
  UNION SELECT a."resolutionFileId" FROM oparl_agenda_items a
    WHERE a.id IN (${AGENDA_ITEMS_OF_PAPERS(paper)})
  UNION SELECT j."targetId" FROM oparl_agenda_item_auxiliary_files j
    WHERE j."ownerId" IN (${AGENDA_ITEMS_OF_PAPERS(paper)})`;

/**
 * A chunk names one meeting and paper, but a document may belong to several
 * (a protocol approved at the next meeting, a file attached to two papers),
 * so documents are matched through every reference to them. An agenda item's
 * chunk names its meeting but not its paper; that comes through its
 * consultation. The IDs are collected first (`= ANY(ARRAY(…))`), so the
 * planner reads the object's few chunks through the B-tree indexes: with
 * `IN (subquery)` it chose the HNSW index, whose filtered scan gave up after
 * 50,000 tuples with 1 of a meeting's 40 nearest chunks (AYC-2132).
 */
const objectConditions: ChunkFilter = (filters, params, bodies) => {
  const conditions: string[] = [];
  if (filters.meetingId) {
    const meeting = params.add(filters.meetingId);
    conditions.push(
      TARGET_IN_SCOPE('oparl_meetings', meeting, bodies),
      `(c."meetingId" = ${meeting} OR c."fileId" = ANY(ARRAY(${MEETING_FILES(meeting)})))`,
    );
  }
  if (filters.paperId) {
    const paper = params.add(filters.paperId);
    conditions.push(
      TARGET_IN_SCOPE('oparl_papers', paper, bodies),
      `(c."paperId" = ${paper}
      OR c."agendaItemId" = ANY(ARRAY(${AGENDA_ITEMS_OF_PAPERS(paper)}))
      OR c."fileId" = ANY(ARRAY(${PAPER_FILES(paper)})))`,
    );
  }
  if (filters.fileId) {
    const file = params.add(filters.fileId);
    conditions.push(
      TARGET_IN_SCOPE('oparl_files', file, bodies),
      `c."fileId" = ${file}`,
    );
  }
  return conditions;
};

const CHUNK_FILTERS: ChunkFilter[] = [
  dateConditions,
  sourceConditions,
  paperTypeConditions,
  organizationConditions,
  personConditions,
  objectConditions,
];

/**
 * Conditions on chunk `c`: in the scope's bodies and matching every filter.
 * An organization, person, meeting, paper or file filter of a body outside
 * the scope matches nothing, even where a reference ties it to a chunk in it.
 */
function chunkConditions(
  scope: OparlReadScope,
  filters: OparlSearchFilters,
  params: SqlParams,
): string[] {
  const bodies = params.add(scope.bodyIds);
  return [
    `c."bodyId" = ANY(${bodies}::varchar[])`,
    ...CHUNK_FILTERS.flatMap((filter) => filter(filters, params, bodies)),
  ];
}

/** The passage chunk `c` is part of: a page of its document, or its paper, meeting or agenda item. */
const PASSAGE = `concat_ws(':', c.source, coalesce(c."fileId", c."agendaItemId", c."paperId", c."meetingId", c.id), c."pageNumber")`;

/**
 * Every word of the query may match (German stemming); ranked by how often
 * the words occur, relative to the log of the chunk's length. Cover density
 * (`ts_rank_cd`) suits all-words queries and ranked natural-language
 * questions far worse in the AYC-2061 evaluation.
 */
export function fullTextSql(
  scope: OparlReadScope,
  query: string,
  filters: OparlSearchFilters,
  limit: number,
): SqlStatement {
  const params = new SqlParams();
  const tsquery = `replace(plainto_tsquery('german', ${params.add(query)})::text, ' & ', ' | ')::tsquery`;
  const conditions = chunkConditions(scope, filters, params);
  return {
    sql: `
      WITH q AS (SELECT ${tsquery} AS q)
      SELECT c.id, ${PASSAGE} AS passage FROM oparl_chunks c, q
      WHERE c."searchVector" @@ q.q AND ${conditions.join(' AND ')}
      ORDER BY ts_rank(c."searchVector", q.q, 1) DESC, c.id
      LIMIT ${params.add(limit)}`,
    params: params.values,
  };
}

/**
 * Nearest chunks by cosine distance. Run with `hnsw.iterative_scan =
 * relaxed_order`, so a filtered HNSW scan goes on until it has `limit`
 * rows; relaxed order is put right by sorting the materialized rows again.
 */
export function vectorSql(
  scope: OparlReadScope,
  query: OparlQueryVector,
  filters: OparlSearchFilters,
  limit: number,
): SqlStatement {
  const params = new SqlParams();
  const column = EMBEDDING_COLUMNS[query.dimensions];
  const vector = `${params.add(JSON.stringify(query.vector))}::halfvec(${Number(query.dimensions)})`;
  const model = params.add(query.modelId);
  const conditions = chunkConditions(scope, filters, params);
  return {
    sql: `
      WITH r AS MATERIALIZED (
        SELECT c.id, ${PASSAGE} AS passage, c."${column}" <=> ${vector} AS distance
        FROM oparl_chunks c
        WHERE c."${column}" IS NOT NULL AND c."embeddingModelId" = ${model}
          AND ${conditions.join(' AND ')}
        ORDER BY distance
        LIMIT ${params.add(limit)})
      SELECT id, passage FROM r ORDER BY distance, id`,
    params: params.values,
  };
}

export const HITS_SQL = `
  SELECT c.id AS "chunkId", c.source, c.text, c.date::text AS date, c."pageNumber",
    b.id AS "bodyId", b.name AS "bodyName",
    p.id AS "paperId", p.name AS "paperName", p.reference AS "paperReference",
    p."paperType", p.web AS "paperWeb",
    m.id AS "meetingId", m.name AS "meetingName", ${ISO('m.start')} AS "meetingStart",
    m.web AS "meetingWeb",
    a.id AS "agendaItemId", a.number AS "agendaItemNumber", a.name AS "agendaItemName",
    a.web AS "agendaItemWeb",
    f.id AS "fileId", f.name AS "fileName", f."accessUrl" AS "fileAccessUrl"
  FROM oparl_chunks c
  JOIN oparl_bodies b ON b.id = c."bodyId"
  LEFT JOIN oparl_agenda_items a ON a.id = c."agendaItemId" AND a."bodyId" = ANY($2::varchar[])
  ${AGENDA_ITEM_PAPER}
  LEFT JOIN oparl_papers p ON p.id = coalesce(c."paperId", ak."paperId") AND p."bodyId" = ANY($2::varchar[])
  LEFT JOIN oparl_meetings m ON m.id = coalesce(c."meetingId", a."meetingId") AND m."bodyId" = ANY($2::varchar[])
  LEFT JOIN oparl_files f ON f.id = c."fileId" AND f."bodyId" = ANY($2::varchar[])
  WHERE c.id = ANY($1::varchar[]) AND c."bodyId" = ANY($2::varchar[])`;

/** The file ($1) in the bodies ($2), with pages $3 on, at most $4. */
export const FILE_CONTENT_SQL = `
  SELECT f.id, f.name, f."fileName", f."mimeType", f.date::text AS date,
    f."accessUrl", f.web, ${BODY_JSON} AS body,
    t.status, t."skipReason", t."pageCount",
    coalesce((
      SELECT json_agg(s.page ORDER BY (s.page->>'number')::int)
      FROM (
        SELECT e AS page FROM jsonb_array_elements(t.pages) e
        WHERE (e->>'number')::int >= $3
        ORDER BY (e->>'number')::int
        LIMIT $4) s), '[]'::json) AS pages
  FROM oparl_files f
  JOIN oparl_bodies b ON b.id = f."bodyId"
  LEFT JOIN oparl_file_texts t ON t."fileId" = f.id
  WHERE f.id = $1 AND f."bodyId" = ANY($2::varchar[])`;

const LOCAL_MIDNIGHT = (date: string, plusDays = 0) =>
  `((${date}::date + ${plusDays})::timestamp AT TIME ZONE 'Europe/Berlin')`;

/** `bodies` is the placeholder of the scope's body IDs. */
interface ListSpec {
  from: string;
  columns: (bodies: string) => string;
  order: string;
  conditions: (
    filters: OparlListFilters,
    params: SqlParams,
    bodies: string,
  ) => string[];
}

const LIST_SPECS: Record<OparlListType, ListSpec> = {
  [OparlListType.MEETINGS]: {
    from: 'oparl_meetings x',
    columns: (
      bodies,
    ) => `x.name, ${ISO('x.start')} AS start, ${ISO('x."end"')} AS "end", x.cancelled, x.web,
      (SELECT coalesce(json_agg(json_build_object('id', o.id, 'name', o.name) ORDER BY o.name), '[]'::json)
       FROM oparl_meeting_organizations mo
       JOIN oparl_organizations o ON o.id = mo."targetId" AND o."bodyId" = ANY(${bodies}::varchar[])
       WHERE mo."ownerId" = x.id) AS organizations`,
    order: 'x.start DESC NULLS LAST, x.id',
    conditions: (filters, params, bodies) => {
      const conditions: string[] = [];
      if (filters.name) {
        conditions.push(
          `x.name ILIKE ${params.add(containsPattern(filters.name))}`,
        );
      }
      if (filters.from) {
        conditions.push(
          `x.start >= ${LOCAL_MIDNIGHT(params.add(filters.from))}`,
        );
      }
      if (filters.to) {
        conditions.push(
          `x.start < ${LOCAL_MIDNIGHT(params.add(filters.to), 1)}`,
        );
      }
      if (filters.organizationId) {
        const org = params.add(filters.organizationId);
        conditions.push(TARGET_IN_SCOPE('oparl_organizations', org, bodies));
        conditions.push(`EXISTS (SELECT 1 FROM oparl_meeting_organizations mo
          WHERE mo."ownerId" = x.id AND mo."targetId" = ${org})`);
      }
      return conditions;
    },
  },
  [OparlListType.ORGANIZATIONS]: {
    from: 'oparl_organizations x',
    columns:
      () => `x.name, x."shortName", x."organizationType", x.classification,
      x."startDate"::text AS "startDate", x."endDate"::text AS "endDate", x.web`,
    order: 'x.name NULLS LAST, x.id',
    conditions: (filters, params) => {
      if (!filters.name) return [];
      const name = params.add(containsPattern(filters.name));
      return [`(x.name ILIKE ${name} OR x."shortName" ILIKE ${name})`];
    },
  },
  [OparlListType.PERSONS]: {
    from: 'oparl_persons x',
    columns: () =>
      `${PERSON_NAME('x')} AS name, coalesce(x.status, '{}') AS status, x.web`,
    order: `x."familyName" NULLS LAST, ${PERSON_NAME('x')} NULLS LAST, x.id`,
    conditions: (filters, params, bodies) => {
      const conditions: string[] = [];
      if (filters.name) {
        conditions.push(
          `${PERSON_NAME('x')} ILIKE ${params.add(containsPattern(filters.name))}`,
        );
      }
      if (filters.organizationId) {
        const org = params.add(filters.organizationId);
        conditions.push(TARGET_IN_SCOPE('oparl_organizations', org, bodies));
        conditions.push(`EXISTS (SELECT 1 FROM oparl_memberships ms
          WHERE ms."personId" = x.id AND ms."organizationId" = ${org})`);
      }
      return conditions;
    },
  },
};

/** One page of a list and the count of all its rows. */
export function listSql(
  scope: OparlReadScope,
  type: OparlListType,
  filters: OparlListFilters,
  page: { offset: number; limit: number },
): { items: SqlStatement; count: SqlStatement } {
  const spec = LIST_SPECS[type];
  const params = new SqlParams();
  const bodies = params.add(scope.bodyIds);
  const conditions = [
    `x."bodyId" = ANY(${bodies}::varchar[])`,
    ...spec.conditions(filters, params, bodies),
  ].join(' AND ');
  const count = {
    sql: `SELECT count(*)::int AS total FROM ${spec.from} WHERE ${conditions}`,
    params: [...params.values],
  };
  const items = `
    SELECT x.id, ${BODY_JSON} AS body, ${spec.columns(bodies)}
    FROM ${spec.from} JOIN oparl_bodies b ON b.id = x."bodyId"
    WHERE ${conditions}
    ORDER BY ${spec.order}
    LIMIT ${params.add(page.limit)} OFFSET ${params.add(page.offset)}`;
  return { items: { sql: items, params: params.values }, count };
}

export type OparlObjectKind = 'paper' | 'meeting' | 'organization' | 'person';

/** Which of the four tables holds the ID ($1) in the bodies ($2). */
export const OBJECT_KIND_SQL = `
  SELECT 'paper' AS kind FROM oparl_papers WHERE id = $1 AND "bodyId" = ANY($2::varchar[])
  UNION ALL SELECT 'meeting' FROM oparl_meetings WHERE id = $1 AND "bodyId" = ANY($2::varchar[])
  UNION ALL SELECT 'organization' FROM oparl_organizations WHERE id = $1 AND "bodyId" = ANY($2::varchar[])
  UNION ALL SELECT 'person' FROM oparl_persons WHERE id = $1 AND "bodyId" = ANY($2::varchar[])
  LIMIT 1`;
