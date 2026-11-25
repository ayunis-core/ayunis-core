import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import {
  locationReferences,
  OPARL_CASCADE_REFS,
  OPARL_TABLES,
  oparlTable,
  type OparlTable,
} from './oparl-mirror-tables';

const q = (identifier: string) => `"${identifier}"`;
const refIdColumn = (ref: string) => q(ref + 'Id');
const refOparlIdColumn = (ref: string) => q(ref + 'OparlId');
const list = (columns: string[], prefix: string) =>
  columns.map((column) => prefix + q(column)).join(', ');

/** Columns read from the JSON rows of an upsert, with their types. */
function recordsetColumns(table: OparlTable): Array<[string, string]> {
  return [
    ['id', 'text'],
    ['oparlId', 'text'],
    ['web', 'text'],
    ['oparlCreated', 'timestamptz'],
    ['oparlModified', 'timestamptz'],
    ['raw', 'jsonb'],
    ...table.fields.map((f): [string, string] => [f.name, f.sqlType]),
    ...table.refs.map((r): [string, string] => [`${r.ref}OparlId`, 'text']),
  ];
}

/**
 * A listed location becomes a row only as the place of a body, meeting or
 * paper, and a full reconciliation removes it once it is no longer one.
 * Location lists also hold persons' and organizations' addresses, which are
 * never mirrored.
 */
function placeOfSomethingCondition(
  systemId: string,
  locationOparlId: string,
): string {
  const exists = locationReferences().map((reference) =>
    reference.kind === 'ref'
      ? `EXISTS (SELECT 1 FROM ${q(reference.table)} r WHERE r."systemId" = ${systemId} AND r.${q(reference.column)} = ${locationOparlId})`
      : `EXISTS (SELECT 1 FROM ${q(reference.table)} j JOIN ${q(reference.ownerTable)} o ON o."id" = j."ownerId" WHERE o."systemId" = ${systemId} AND j."targetOparlId" = ${locationOparlId})`,
  );
  return `(${exists.join(' OR ')})`;
}

/**
 * A listed object is written when its original or references changed, or
 * the row holds an embedded form. An embedded one replaces a listed form
 * only when newer by `modified`; another embedded form also when it is new
 * or, without `modified`, changed. Embedded forms often omit what the
 * listed form has, and must not overwrite it back and forth.
 */
function changedCondition(table: OparlTable, embedded: boolean): string {
  const tracked = ['raw', ...table.refs.map((r) => r.ref + 'OparlId')];
  const changed = `(${list(tracked, 't.')}) IS DISTINCT FROM (${list(tracked, 'EXCLUDED.')})`;
  if (!embedded) return `${changed} OR NOT t."fromListing"`;
  return `EXCLUDED."oparlModified" > t."oparlModified" OR (NOT t."fromListing" AND t."oparlModified" IS NULL AND (EXCLUDED."oparlModified" IS NOT NULL OR ${changed}))`;
}

/**
 * Upserts JSON rows ($1) of one type for a system ($2) and body ($3).
 * Returns the IDs of the rows written. A changed reference drops its link
 * until `linkReferencesSql` links it again.
 */
export function upsertSql(type: OparlEntityType, embedded: boolean): string {
  const table = oparlTable(type);
  const columns = recordsetColumns(table);
  const scopeColumns = table.bodyScoped ? ['systemId', 'bodyId'] : ['systemId'];
  const insertColumns = [
    ...scopeColumns,
    'fromListing',
    ...columns.map(([name]) => name),
  ].map(q);
  const selectColumns = [
    ...scopeColumns.map((_, index) => `$${index + 2}::text`),
    String(!embedded),
    ...columns.map(([name]) => `v.${q(name)}`),
  ];
  const updates = [
    ...(table.bodyScoped ? ['bodyId'] : []),
    'fromListing',
    ...columns.map(([name]) => name).filter((name) => name !== 'id'),
  ].map((name) => `${q(name)} = EXCLUDED.${q(name)}`);
  const refLinks = table.refs.map(({ ref }) => {
    const id = refIdColumn(ref);
    const oparlId = refOparlIdColumn(ref);
    return `${id} = CASE WHEN t.${oparlId} IS NOT DISTINCT FROM EXCLUDED.${oparlId} THEN t.${id} END`;
  });
  const filter =
    type === OparlEntityType.LOCATION && !embedded
      ? `WHERE ${placeOfSomethingCondition('$2', 'v."oparlId"')}`
      : '';
  return `INSERT INTO ${q(table.name)} AS t (${insertColumns.join(', ')})
SELECT ${selectColumns.join(', ')}
FROM jsonb_to_recordset($1::jsonb) AS v(${columns.map(([name, sqlType]) => `${q(name)} ${sqlType}`).join(', ')})
${filter}
ON CONFLICT ("systemId", "oparlId") DO UPDATE SET ${[...updates, ...refLinks, '"updatedAt" = now()'].join(', ')}
WHERE ${changedCondition(table, embedded)}
RETURNING "id", "oparlId"`;
}

/** Removes the join rows of owners ($1, text[]), then inserts JSON rows ($1) of a system ($2). */
export function replaceJoinSql(
  joinTable: string,
  targetTable: string,
): { remove: string; insert: string } {
  return {
    remove: `DELETE FROM ${q(joinTable)} WHERE "ownerId" = ANY($1::text[])`,
    insert: `INSERT INTO ${q(joinTable)} ("ownerId", "targetOparlId", "targetId")
SELECT v."ownerId", v."targetOparlId", r."id"
FROM jsonb_to_recordset($1::jsonb) AS v("ownerId" text, "targetOparlId" text)
LEFT JOIN ${q(targetTable)} r ON r."systemId" = $2 AND r."oparlId" = v."targetOparlId"
ON CONFLICT DO NOTHING`,
  };
}

/** Links references of a system ($1) whose target has been mirrored since. */
export function linkReferencesSql(): string[] {
  return Object.values(OparlEntityType).flatMap((type) => {
    const table = oparlTable(type);
    return [
      ...table.refs.map(({ ref, targetTable }) => {
        const id = refIdColumn(ref);
        const oparlId = refOparlIdColumn(ref);
        return `UPDATE ${q(table.name)} AS s SET ${id} = r."id" FROM ${q(targetTable)} AS r WHERE s."systemId" = $1 AND s.${id} IS NULL AND s.${oparlId} IS NOT NULL AND r."systemId" = $1 AND r."oparlId" = s.${oparlId}`;
      }),
      ...table.joins.map(
        (join) =>
          `UPDATE ${q(join.table)} AS j SET "targetId" = r."id" FROM ${q(table.name)} AS o, ${q(join.targetTable)} AS r WHERE j."ownerId" = o."id" AND o."systemId" = $1 AND j."targetId" IS NULL AND r."systemId" = $1 AND r."oparlId" = j."targetOparlId"`,
      ),
    ];
  });
}

/** Deletes objects ($2, text[]) of a system ($1); returns `n`. */
export function deleteSql(type: OparlEntityType): string {
  return `WITH d AS (DELETE FROM ${q(OPARL_TABLES[type])} WHERE "systemId" = $1 AND "oparlId" = ANY($2::text[]) RETURNING 1) SELECT count(*)::int AS n FROM d`;
}

/** Whether run $2 did not list the row `alias` of a type of system $1, or it is a location that is no place. */
function unlistedCondition(type: OparlEntityType, alias: string): string {
  const unlisted = `NOT EXISTS (SELECT 1 FROM "oparl_sync_listed_objects" l WHERE l."runId" = $2 AND l."entityType" = '${type}' AND l."oparlId" = ${alias}."oparlId")`;
  if (type !== OparlEntityType.LOCATION) return unlisted;
  const place = placeOfSomethingCondition('$1', alias + '."oparlId"');
  return `(${unlisted} OR NOT ${place})`;
}

/** Whether removing what run $2 did not list removes row `t`: itself, or its body or a parent it cascades from. */
function removedCondition(type: OparlEntityType): string {
  const parents = [
    ...(type === OparlEntityType.BODY
      ? []
      : [{ column: 'bodyId', target: OparlEntityType.BODY }]),
    ...(OPARL_CASCADE_REFS[type] ?? []).map(({ ref, target }) => ({
      column: ref + 'Id',
      target,
    })),
  ];
  return [
    unlistedCondition(type, 't'),
    ...parents.map(
      ({ column, target }) =>
        `EXISTS (SELECT 1 FROM ${q(OPARL_TABLES[target])} p WHERE p."id" = t.${q(column)} AND ${unlistedCondition(target, 'p')})`,
    ),
  ].join(' OR ');
}

/** Rows of each type of a system ($1) and how many of them removing what run $2 did not list would remove. */
export function countUnlistedSql(): string {
  return Object.values(OparlEntityType)
    .map(
      (type) =>
        `SELECT '${type}' AS "type", count(*)::int AS "total", count(*) FILTER (WHERE ${removedCondition(type)})::int AS "removed" FROM ${q(OPARL_TABLES[type])} t WHERE t."systemId" = $1`,
    )
    .join('\nUNION ALL\n');
}

/** Deletes the objects of a type of system $1 that run $2 did not list; returns `n`. */
export function deleteUnlistedSql(type: OparlEntityType): string {
  return `WITH d AS (DELETE FROM ${q(OPARL_TABLES[type])} t WHERE t."systemId" = $1 AND ${unlistedCondition(type, 't')} RETURNING 1) SELECT count(*)::int AS n FROM d`;
}

/** Rows per system ($1, text[]) and type. */
export function countByTypeSql(): string {
  return Object.values(OparlEntityType)
    .map(
      (type) =>
        `SELECT "systemId", '${type}' AS "type", count(*)::int AS "count" FROM ${q(OPARL_TABLES[type])} WHERE "systemId" = ANY($1::text[]) GROUP BY "systemId"`,
    )
    .join('\nUNION ALL\n');
}
