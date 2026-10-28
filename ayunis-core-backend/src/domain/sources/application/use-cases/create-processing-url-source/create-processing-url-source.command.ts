import type { UUID } from 'crypto';

export class CreateProcessingUrlSourceCommand {
  readonly url: string;
  readonly knowledgeBaseId?: UUID;
  readonly maxDepth: number;

  constructor(params: {
    url: string;
    maxDepth: number;
    knowledgeBaseId?: UUID;
  }) {
    this.url = params.url;
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.maxDepth = params.maxDepth;
  }
}
