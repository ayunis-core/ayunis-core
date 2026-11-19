import type { UUID } from 'crypto';

/** A stored file the document pipeline turns into its source's text and index. */
export interface DocumentToProcess {
  sourceId: UUID;
  orgId: UUID;
  minioPath: string;
  fileName: string;
  fileType: string;
  /**
   * True for directly uploaded originals, which stay in storage while their
   * source exists; absent for legacy staged files the consumer removes.
   */
  retainFile?: boolean;
  /**
   * Size the upload was verified at. The consumer refuses an object of any
   * other size, since the browser's signed URLs may outlive completion.
   */
  expectedSize?: number;
  expectedETag?: string;
  /**
   * True for meeting recordings: the transcript is kept as timed speaker
   * segments and indexed in chunks that know their time range.
   */
  keepTranscriptSegments?: boolean;
  /**
   * True when the caller backs off from provider outages itself: the
   * pipeline then hands such a failure back as a {@link ProcessingDeferredError}
   * instead of retrying or failing the source.
   */
  deferProviderOutages?: boolean;
}

/**
 * A provider outage stopped the pipeline; the source is still PROCESSING
 * with its saved results, for the caller to process again later.
 */
export class ProcessingDeferredError extends Error {
  constructor(readonly outage: unknown) {
    super('Processing deferred for a provider outage', { cause: outage });
    this.name = 'ProcessingDeferredError';
  }
}
