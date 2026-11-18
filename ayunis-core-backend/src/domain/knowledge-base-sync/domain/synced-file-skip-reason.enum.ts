export enum SyncedFileSkipReason {
  UNSUPPORTED_TYPE = 'unsupported_type',
  TOO_LARGE = 'too_large',
  ENCRYPTED = 'encrypted',
  /** A user removed its failed document. */
  REMOVED_AFTER_FAILURE = 'removed_after_failure',
}
