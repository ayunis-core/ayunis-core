/** Wall-clock split of a bulk ingest, for pipeline stage telemetry. */
export interface IngestBulkOutcome {
  embeddingMs: number;
  indexingMs: number;
}
