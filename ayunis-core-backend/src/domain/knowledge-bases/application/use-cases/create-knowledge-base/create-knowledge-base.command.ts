import type { UUID } from 'crypto';

export class CreateKnowledgeBaseCommand {
  public readonly name: string;
  public readonly description: string;
  public readonly userId: UUID;
  public readonly orgId: UUID;
  public readonly workspaceId?: UUID;
  public readonly originKnowledgeBaseId?: UUID;
  public readonly importedOriginVersion?: number;

  constructor(params: {
    name: string;
    description?: string;
    userId: UUID;
    orgId: UUID;
    workspaceId?: UUID;
    originKnowledgeBaseId?: UUID;
    importedOriginVersion?: number;
  }) {
    this.name = params.name;
    this.description = params.description ?? '';
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.workspaceId = params.workspaceId;
    this.originKnowledgeBaseId = params.originKnowledgeBaseId;
    this.importedOriginVersion = params.importedOriginVersion;
  }
}
