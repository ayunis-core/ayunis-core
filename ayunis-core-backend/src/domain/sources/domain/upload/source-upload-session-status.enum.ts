export enum SourceUploadSessionStatus {
  /** The browser may still transfer bytes; nothing references the object. */
  PENDING = 'pending',
  /** Sources exist but the processing job is not confirmed queued yet. */
  SOURCES_CREATED = 'sources_created',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  ABORTED = 'aborted',
}
