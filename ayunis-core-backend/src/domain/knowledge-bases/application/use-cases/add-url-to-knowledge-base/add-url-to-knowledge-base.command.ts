import type { UUID } from 'crypto';

export class AddUrlToKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly url: string;
  readonly maxDepth: number;

  constructor(params: {
    knowledgeBaseId: UUID;
    url: string;
    maxDepth?: number;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.url = params.url;
    this.maxDepth = params.maxDepth ?? 0;
  }
}
