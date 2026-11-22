export enum SyncedFileState {
  /** Has a document, unless a user removed it. */
  IMPORTED = 'imported',
  /** Cannot be processed; not tried again until its version changes. */
  SKIPPED = 'skipped',
  /** Waits for room in the knowledge base. */
  AWAITING_CAPACITY = 'awaiting_capacity',
}
