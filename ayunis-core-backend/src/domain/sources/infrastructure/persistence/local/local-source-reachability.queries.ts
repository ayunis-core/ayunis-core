import type { UUID } from 'crypto';
import { Brackets, type Repository, type SelectQueryBuilder } from 'typeorm';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import type { SourceRecord } from './schema/source.record';

/**
 * Cross-module reachability of sources, kept in one place so the skill and
 * thread table names stay out of every other adapter: a source is reachable
 * through a knowledge base, a recording, a skill, or a thread assignment. A
 * hidden replacement belongs to the source it replaces.
 */
function unreferencedBefore(
  query: SelectQueryBuilder<SourceRecord>,
  olderThan: Date,
  countThreadAssignments: boolean,
): SelectQueryBuilder<SourceRecord> {
  const scoped = query
    .andWhere('s."knowledgeBaseId" IS NULL')
    .andWhere('s."recordingId" IS NULL')
    .andWhere('s."replacesSourceId" IS NULL')
    .andWhere('s."createdAt" < :olderThan', { olderThan })
    .andWhere(
      `NOT EXISTS (SELECT 1 FROM skill_sources ss WHERE ss."sourcesId" = s.id)`,
    );
  if (!countThreadAssignments) return scoped;
  return scoped.andWhere(
    `NOT EXISTS (SELECT 1 FROM thread_source_assignments a WHERE a."sourceId" = s.id)`,
  );
}

/**
 * The stale-thread sweep passes candidates that are thread-assigned by
 * construction (every assignment proven stale), so it must ignore those
 * rows; every other caller counts a thread assignment as a reference.
 */
export async function findUnreferencedSourceIds(
  repository: Repository<SourceRecord>,
  candidateIds: UUID[],
  olderThan: Date,
  ignoreThreadAssignments: boolean,
): Promise<UUID[]> {
  const rows = await unreferencedBefore(
    repository
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .where('s.id IN (:...candidateIds)', { candidateIds }),
    olderThan,
    !ignoreThreadAssignments,
  ).getRawMany<{ id: UUID }>();
  return rows.map((row) => row.id);
}

export async function findOrphanedSourceIds(
  repository: Repository<SourceRecord>,
  olderThan: Date,
  limit: number,
): Promise<UUID[]> {
  const rows = await unreferencedBefore(
    repository.createQueryBuilder('s').select('s.id', 'id'),
    olderThan,
    true,
  )
    .orderBy('s."createdAt"', 'ASC')
    .limit(limit)
    .getRawMany<{ id: UUID }>();
  return rows.map((row) => row.id);
}

const SKILL_OWNER_ORG = `COALESCE(k."orgId", ku."orgId", kw."orgId", kt.org_id)`;

/**
 * `SELECT "sourceId", "orgId"` for every source the organisation reaches
 * through a knowledge base, a recording, a thread or a skill. `where` is
 * applied in each branch, given that branch's source and org columns, so a
 * filter on either reaches the branch's indexes.
 */
export function sourceOrgsQuery(
  where: (sourceId: string, orgId: string) => string,
): string {
  return [
    `SELECT s.id AS "sourceId", kb."orgId" AS "orgId" FROM sources s
       JOIN knowledge_bases kb ON kb.id = s."knowledgeBaseId"
       WHERE ${where('s.id', 'kb."orgId"')}`,
    `SELECT s.id, r."orgId" FROM sources s
       JOIN recordings r ON r.id = s."recordingId"
       WHERE ${where('s.id', 'r."orgId"')}`,
    `SELECT a."sourceId", u."orgId" FROM thread_source_assignments a
       JOIN threads t ON t.id = a."threadId"
       JOIN users u ON u.id = t."userId"
       WHERE ${where('a."sourceId"', 'u."orgId"')}`,
    `SELECT ss."sourcesId", ${SKILL_OWNER_ORG} FROM skill_sources ss
       JOIN skills k ON k.id = ss."skillsId"
       LEFT JOIN users ku ON ku.id = k."userId"
       LEFT JOIN workspaces kw ON kw.id = k."workspaceId"
       LEFT JOIN teams kt ON kt.id = k."teamId"
       WHERE ${where('ss."sourcesId"', SKILL_OWNER_ORG)}`,
  ].join('\nUNION\n');
}

/**
 * Text sources are the ones that get embedded; failed ones have their partial
 * index removed. A source counts when it was recorded with the model, which
 * outlives the org's permit, or when one of `orgIds` reaches it, which covers
 * sources indexed before the model was recorded and those being re-indexed.
 */
export async function hasIndexedSourceInOrgs(
  repository: Repository<SourceRecord>,
  embeddingModelId: UUID,
  orgIds: UUID[],
): Promise<boolean> {
  const indexed = new Brackets((qb) => {
    qb.where('s."embeddingModelId" = :embeddingModelId', { embeddingModelId });
    if (orgIds.length === 0) return;
    const reachableFromOrgs = sourceOrgsQuery(
      (_sourceId, orgId) => `${orgId} IN (:...orgIds)`,
    );
    qb.orWhere(
      `s.id IN (SELECT reachable."sourceId" FROM (${reachableFromOrgs}) reachable)`,
      { orgIds },
    );
  });
  const row = await repository
    .createQueryBuilder('s')
    .select('1', 'found')
    .where('s."type" = :textType', { textType: SourceType.TEXT })
    .andWhere('s."status" <> :failed', { failed: SourceStatus.FAILED })
    .andWhere(indexed)
    .limit(1)
    .getRawOne<{ found: number }>();
  return row !== undefined;
}
