import type { UUID } from 'crypto';

export class AddWebSyncedLocationCommand {
  readonly knowledgeBaseId: UUID;
  /** The website's URL, where the crawl starts. */
  readonly url: string;
  /** Link depth to follow: 0 = the page only, 1 = + linked pages, 2 = + theirs. */
  readonly depth: number;

  constructor(params: { knowledgeBaseId: UUID; url: string; depth: number }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.url = params.url;
    this.depth = params.depth;
  }
}
