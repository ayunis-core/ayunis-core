import type { UUID } from 'crypto';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import type { SourceRecord } from './schema/source.record';

/**
 * Cross-module reachability of sources, kept in one place so the skill and
 * thread table names stay out of every other adapter: a source is reachable
 * through a knowledge base, a skill, or a thread assignment.
 */
function unreferencedBefore(
  query: SelectQueryBuilder<SourceRecord>,
  olderThan: Date,
  countThreadAssignments: boolean,
): SelectQueryBuilder<SourceRecord> {
  const scoped = query
    .andWhere('s."knowledgeBaseId" IS NULL')
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
