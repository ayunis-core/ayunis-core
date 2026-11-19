import type { UUID } from 'crypto';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

/** Writes many sources in one statement each, for callers such as a sync. */
export abstract class SourceBatchWriteRepository {
  /** Inserts new file sources with empty details, as the pipeline expects. */
  abstract insertFileSources(files: FileSource[]): Promise<void>;
  /** Renames the sources that still exist; others are left out silently. */
  abstract rename(renames: { sourceId: UUID; name: string }[]): Promise<void>;
  /** Locks the sources that still exist until the transaction ends, by ID. */
  abstract lock(sourceIds: UUID[]): Promise<void>;
}
