import type { UUID } from 'crypto';

export interface UrlCrawlJobData {
  sourceId: UUID;
  orgId: UUID;
  userId: UUID;
  rootUrl: string;
  maxDepth: number;
}

/**
 * Port for enqueuing URL crawl jobs.
 */
export abstract class UrlCrawlProcessingPort {
  abstract enqueue(data: UrlCrawlJobData): Promise<void>;
  /** Best-effort cancellation: remove a waiting/delayed job or signal an active one. */
  abstract cancelJob(sourceId: UUID): Promise<void>;
}
