import type { UUID } from 'crypto';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';

export abstract class MemoryRepository {
  abstract findAllByUserId(userId: UUID): Promise<MemoryEntry[]>;
  abstract findByUserIdAndKey(
    userId: UUID,
    key: string,
  ): Promise<MemoryEntry | null>;
  /**
   * Creates the entry or replaces the content of an existing one. Implementations
   * must do this in a single statement: the model and the settings page can write
   * the same key concurrently, and a read-then-write would lose one of them.
   */
  abstract upsert(entry: MemoryEntry): Promise<MemoryEntry>;
  abstract deleteByUserIdAndKey(userId: UUID, key: string): Promise<void>;
  abstract deleteAllByUserId(userId: UUID): Promise<void>;
  abstract countByUserId(userId: UUID): Promise<number>;
}
