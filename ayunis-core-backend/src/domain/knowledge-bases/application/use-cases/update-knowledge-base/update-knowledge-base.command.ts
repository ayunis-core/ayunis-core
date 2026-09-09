import type { UUID } from 'crypto';

export class UpdateKnowledgeBaseCommand {
  public readonly knowledgeBaseId: UUID;
  public readonly name?: string;
  public readonly description?: string;

  constructor(params: {
    knowledgeBaseId: UUID;
    name?: string;
    description?: string;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.name = params.name;
    this.description = params.description;
  }
}
