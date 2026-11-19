import type { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';

export interface SkippedSyncedFile {
  name: string;
  path: string;
  reason: SyncedFileSkipReason;
}

/** What a location's files amount to, for showing its state. */
export interface SyncedFilesSummary {
  /** Files that have a document. */
  documents: number;
  /** Files with a document whose latest version failed to process. */
  failed: number;
  /** Files waiting for room in the knowledge base. */
  awaitingCapacity: number;
  skippedCount: number;
  /** The first skipped files by path, up to the limit asked for. */
  skipped: SkippedSyncedFile[];
}

export const EMPTY_SYNCED_FILES_SUMMARY: SyncedFilesSummary = {
  documents: 0,
  failed: 0,
  awaitingCapacity: 0,
  skippedCount: 0,
  skipped: [],
};
