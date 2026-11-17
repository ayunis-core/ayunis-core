import type { UUID } from 'crypto';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';

export abstract class MemoryRepository {
  abstract findAllByUserId(userId: UUID): Promise<MemoryEntry[]>;
  abstract findByUserIdAndKey(
    userId: UUID,
    key: string,
  ): Promise<MemoryEntry | null>;
  /**
   * Creates the entry or replaces the content of an existing one, and its
   * description unless `keepDescription`. Returns `null` instead when the key
   * is new and the user already has `limit` entries. Concurrent writes of the
   * same user, such as tool calls of one turn, must not exceed the limit.
   */
  abstract upsertWithinLimit(
    entry: MemoryEntry,
    options: { limit: number; keepDescription: boolean },
  ): Promise<MemoryEntry | null>;
  abstract deleteByUserIdAndKey(userId: UUID, key: string): Promise<void>;
  abstract deleteAllByUserId(userId: UUID): Promise<void>;
}
