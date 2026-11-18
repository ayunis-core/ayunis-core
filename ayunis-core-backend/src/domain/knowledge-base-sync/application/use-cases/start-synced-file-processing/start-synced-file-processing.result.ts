import type { DocumentToProcess } from 'src/domain/sources/application/models/document-to-process';

export enum StartSyncedFileProcessingOutcome {
  /** The new version is stored as a replacement, ready for the pipeline. */
  PROCESS = 'process',
  /** The source system asks to retry later; nothing changed. */
  THROTTLED = 'throttled',
  /** The location is no longer accessible; its documents stay. */
  ACCESS_LOST = 'access_lost',
  /** The file no longer exists; it is removed with its document. */
  GONE = 'gone',
  /** The job is outdated: file, document or version moved on, or are gone. */
  SKIPPED = 'skipped',
  /** Connectors are switched off; nothing was done. */
  DISABLED = 'disabled',
}

export type StartSyncedFileProcessingResult =
  | {
      outcome: StartSyncedFileProcessingOutcome.PROCESS;
      document: DocumentToProcess;
    }
  | { outcome: StartSyncedFileProcessingOutcome.THROTTLED; retryAt: Date }
  | {
      outcome:
        | StartSyncedFileProcessingOutcome.ACCESS_LOST
        | StartSyncedFileProcessingOutcome.GONE
        | StartSyncedFileProcessingOutcome.SKIPPED
        | StartSyncedFileProcessingOutcome.DISABLED;
    };
