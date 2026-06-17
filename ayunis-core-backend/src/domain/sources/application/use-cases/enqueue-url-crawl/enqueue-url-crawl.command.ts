import type { UUID } from 'crypto';

export class EnqueueUrlCrawlCommand {
  readonly sourceId: UUID;
  readonly orgId: UUID;
  readonly userId: UUID;
  readonly rootUrl: string;
  readonly maxDepth: number;

  constructor(params: {
    sourceId: UUID;
    orgId: UUID;
    userId: UUID;
    rootUrl: string;
    maxDepth: number;
  }) {
    this.sourceId = params.sourceId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.rootUrl = params.rootUrl;
    this.maxDepth = params.maxDepth;
  }
}
