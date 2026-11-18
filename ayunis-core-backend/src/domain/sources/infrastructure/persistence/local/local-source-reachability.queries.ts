import type { UUID } from 'crypto';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import type { SourceRecord } from './schema/source.record';

/**
 * Cross-module reachability of sources, kept in one place so the skill and
 * thread table names stay out of every other adapter: a source is reachable
 * through a knowledge base, a recording, a skill, or a thread assignment.
 */
function unreferencedBefore(
  query: SelectQueryBuilder<SourceRecord>,
  olderThan: Date,
  countThreadAssignments: boolean,
): SelectQueryBuilder<SourceRecord> {
  const scoped = query
    .andWhere('s."knowledgeBaseId" IS NULL')
    .andWhere('s."recordingId" IS NULL')
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

/**
 * Text sources are the ones that get embedded; failed ones have their partial
 * index removed. Each branch resolves the owning organization of one
 * reachability path, so a source counts for every org that can reach it.
 */
export async function hasIndexedSourceInOrgs(
  repository: Repository<SourceRecord>,
  orgIds: UUID[],
): Promise<boolean> {
  const reachableFromOrgs = `
    SELECT kbs.id FROM sources kbs
      JOIN knowledge_bases kb ON kb.id = kbs."knowledgeBaseId"
      WHERE kb."orgId" IN (:...orgIds)
    UNION ALL
    SELECT rs.id FROM sources rs
      JOIN recordings r ON r.id = rs."recordingId"
      WHERE r."orgId" IN (:...orgIds)
    UNION ALL
    SELECT a."sourceId" FROM thread_source_assignments a
      JOIN threads t ON t.id = a."threadId"
      JOIN users tu ON tu.id = t."userId"
      WHERE tu."orgId" IN (:...orgIds)
    UNION ALL
    SELECT ss."sourcesId" FROM skill_sources ss
      JOIN skills sk ON sk.id = ss."skillsId"
      LEFT JOIN users su ON su.id = sk."userId"
      LEFT JOIN workspaces w ON w.id = sk."workspaceId"
      LEFT JOIN teams tm ON tm.id = sk."teamId"
      WHERE COALESCE(sk."orgId", su."orgId", w."orgId", tm.org_id) IN (:...orgIds)`;
  const row = await repository
    .createQueryBuilder('s')
    .select('1', 'found')
    .where('s."type" = :textType', { textType: SourceType.TEXT })
    .andWhere('s."status" <> :failed', { failed: SourceStatus.FAILED })
    .andWhere(`s.id IN (${reachableFromOrgs})`, { orgIds })
    .limit(1)
    .getRawOne<{ found: number }>();
  return row !== undefined;
}
