import type { UUID } from 'crypto';
import { InvalidReorderError } from './academy.errors';

/**
 * Ensures the submitted ids are exactly the current set of ids
 * (same members, any order). Throws InvalidReorderError otherwise.
 */
export function assertSameIdSet(
  currentIds: UUID[],
  submittedIds: UUID[],
): void {
  const current = new Set<UUID>(currentIds);
  const submitted = new Set<UUID>(submittedIds);
  const missing = currentIds.filter((id) => !submitted.has(id));
  const extra = submittedIds.filter((id) => !current.has(id));
  if (missing.length > 0 || extra.length > 0) {
    throw new InvalidReorderError({ missing, extra });
  }
}
