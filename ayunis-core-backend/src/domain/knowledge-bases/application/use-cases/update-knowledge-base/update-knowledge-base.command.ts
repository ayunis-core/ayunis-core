import type { UUID } from 'crypto';

export class UpdateKnowledgeBaseCommand {
  public readonly knowledgeBaseId: UUID;
  public readonly userId: UUID;
  public readonly name?: string;
  public readonly description?: string;

  constructor(params: {
    knowledgeBaseId: UUID;
    userId: UUID;
    name?: string;
    description?: string;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.userId = params.userId;
    this.name = params.name;
    this.description = params.description;
  }
}
