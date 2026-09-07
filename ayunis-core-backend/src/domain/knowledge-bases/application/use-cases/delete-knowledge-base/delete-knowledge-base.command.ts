import type { UUID } from 'crypto';

export class DeleteKnowledgeBaseCommand {
  public readonly knowledgeBaseId: UUID;
  public readonly userId: UUID;
  public readonly workspaceId?: UUID;

  constructor(params: {
    knowledgeBaseId: UUID;
    userId: UUID;
    workspaceId?: UUID;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.userId = params.userId;
    this.workspaceId = params.workspaceId;
  }
}
