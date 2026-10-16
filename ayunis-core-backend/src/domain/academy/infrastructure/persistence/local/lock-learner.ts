import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';

/**
 * Takes the learner's advisory lock until the surrounding transaction ends.
 * Heartbeats and chapter confirmations share it, so neither can read state
 * another request of the same learner has written but not yet committed.
 */
export async function lockLearner(
  manager: EntityManager,
  userId: UUID,
): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    userId,
  ]);
}
