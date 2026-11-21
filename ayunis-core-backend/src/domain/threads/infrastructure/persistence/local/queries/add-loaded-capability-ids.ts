import type { Repository } from 'typeorm';
import type { AddLoadedCapabilityIdsParams } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { accessibleThread } from './personal-or-member-workspace';

/**
 * One statement, so a concurrent load is re-evaluated against the row the
 * other one wrote instead of overwriting it.
 */
export async function addLoadedCapabilityIds(
  threadRepository: Repository<ThreadRecord>,
  params: AddLoadedCapabilityIdsParams,
): Promise<void> {
  const result = await threadRepository
    .createQueryBuilder()
    .update(ThreadRecord)
    .set({
      loadedCapabilityIds: () => `loaded_capability_ids || ARRAY(
        SELECT requested.id
        FROM unnest(CAST(:capabilityIds AS text[])) WITH ORDINALITY AS requested(id, position)
        WHERE requested.id <> ALL(loaded_capability_ids)
        GROUP BY requested.id
        ORDER BY min(requested.position)
      )`,
    })
    .setParameter('capabilityIds', params.capabilityIds)
    .where(accessibleThread(params.threadId, params.userId))
    .execute();
  if (!result.affected) {
    throw new ThreadNotFoundError(params.threadId, params.userId);
  }
}
