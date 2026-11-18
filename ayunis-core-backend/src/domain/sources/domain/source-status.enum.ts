export enum SourceStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  /**
   * The stored text is being embedded again because the org's embedding
   * model changed. Not PROCESSING: the stale-processing cleanup must not fail
   * it, and re-index jobs may wait long behind uploads.
   */
  REINDEXING = 'reindexing',
}
