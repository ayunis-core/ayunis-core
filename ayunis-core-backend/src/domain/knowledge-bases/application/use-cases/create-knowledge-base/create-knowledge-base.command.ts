import type { KnowledgeBaseOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export class CreateKnowledgeBaseCommand {
  public readonly name: string;
  public readonly description: string;
  public readonly owner: KnowledgeBaseOwner;

  constructor(params: {
    name: string;
    description?: string;
    owner: KnowledgeBaseOwner;
  }) {
    this.name = params.name;
    this.description = params.description ?? '';
    this.owner = params.owner;
  }
}
