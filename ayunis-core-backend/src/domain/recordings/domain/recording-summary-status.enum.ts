/** Where a recording's summary run is. */
export enum RecordingSummaryStatus {
  /** Queued, for the automatic run after transcription or a "Try again". */
  PENDING = 'pending',
  RUNNING = 'running',
  READY = 'ready',
  FAILED = 'failed',
}
