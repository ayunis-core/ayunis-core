import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { SourceRecord } from './schema/source.record';

/**
 * One statement on purpose: Postgres re-evaluates its status predicate on a
 * row that a concurrent transaction changed, whereas selecting the failed ids
 * first and deleting them by id would remove a source that was re-queued in
 * between.
 */
export async function deleteFailedSources(
  repository: Repository<SourceRecord>,
  knowledgeBaseId: UUID,
): Promise<Pick<Source, 'id' | 'storageKey'>[]> {
  const result = await repository
    .createQueryBuilder()
    .delete()
    .where('"knowledgeBaseId" = :knowledgeBaseId', { knowledgeBaseId })
    .andWhere('status = :status', { status: SourceStatus.FAILED })
    .returning(['id', 'storageKey'])
    .execute();
  return result.raw as Pick<Source, 'id' | 'storageKey'>[];
}
