import type { UUID } from 'crypto';

export class FindActiveKnowledgeBasesQuery {
  public readonly knowledgeBaseId?: UUID;
  public readonly sourceId?: UUID;

  constructor(params: { knowledgeBaseId?: UUID; sourceId?: UUID } = {}) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.sourceId = params.sourceId;
  }
}
