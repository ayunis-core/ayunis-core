import type { UUID } from 'crypto';
import type { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';

export interface UrlCrawlJobData {
  sourceId: UUID;
  orgId: UUID;
  userId: UUID;
  rootUrl: string;
  maxDepth: number;
  /** Absent on jobs enqueued before re-indexing existed; those are initial runs. */
  kind?: SourceIngestionKind;
}

/**
 * Port for enqueuing URL crawl jobs.
 */
export abstract class UrlCrawlProcessingPort {
  abstract enqueue(data: UrlCrawlJobData): Promise<void>;
  /** Best-effort cancellation: remove a waiting/delayed job or signal an active one. */
  abstract cancelJob(sourceId: UUID): Promise<void>;
}
