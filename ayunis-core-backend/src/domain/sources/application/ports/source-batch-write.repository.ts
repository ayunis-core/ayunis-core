import type { UUID } from 'crypto';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

export interface ReplacedSource {
  id: UUID;
  storageKey: string | null;
}

/**
 * Writes many sources in one statement each, and the hidden replacements of
 * changed files, for callers such as a sync.
 */
export abstract class SourceBatchWriteRepository {
  /** Inserts new file sources with empty details, as the pipeline expects. */
  abstract insertFileSources(files: FileSource[]): Promise<void>;
  /** Renames the sources that still exist; others are left out silently. */
  abstract rename(renames: { sourceId: UUID; name: string }[]): Promise<void>;
  /**
   * Locks the sources that still exist until the transaction ends, by ID,
   * and returns their IDs.
   */
  abstract lock(sourceIds: UUID[]): Promise<UUID[]>;
  /**
   * Inserts a replacement of `replacedId` with empty details, outside every
   * knowledge base. The caller holds the lock of the replaced source.
   */
  abstract insertReplacement(
    replacement: FileSource,
    replacedId: UUID,
  ): Promise<void>;
  abstract findReplacementIds(replacedId: UUID): Promise<UUID[]>;
  /**
   * Stops the stale-processing clock of a PROCESSING source until its
   * processing starts again.
   */
  abstract pauseProcessing(sourceId: UUID): Promise<void>;
  /**
   * Puts a settled replacement into the knowledge base of the source it
   * replaces, under `name`, and returns that source. A FAILED replacement
   * takes the place only of a source without an indexed version. `null` for
   * a replacement that is gone, still processing, or failed beside an
   * indexed version.
   */
  abstract moveReplacementIn(
    replacementId: UUID,
    name: string,
  ): Promise<ReplacedSource | null>;
}
