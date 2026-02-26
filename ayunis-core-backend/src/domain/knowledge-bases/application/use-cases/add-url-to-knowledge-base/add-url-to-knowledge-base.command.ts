import type { UUID } from 'crypto';

export class AddUrlToKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly userId: UUID;
  readonly url: string;

  constructor(params: { knowledgeBaseId: UUID; userId: UUID; url: string }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.userId = params.userId;
    this.url = params.url;
  }
}
