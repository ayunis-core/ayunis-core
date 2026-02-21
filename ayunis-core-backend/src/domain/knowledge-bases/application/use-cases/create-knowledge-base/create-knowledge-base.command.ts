import type { UUID } from 'crypto';

export class CreateKnowledgeBaseCommand {
  public readonly name: string;
  public readonly description: string;
  public readonly userId: UUID;
  public readonly orgId: UUID;

  constructor(params: {
    name: string;
    description?: string;
    userId: UUID;
    orgId: UUID;
  }) {
    this.name = params.name;
    this.description = params.description ?? '';
    this.userId = params.userId;
    this.orgId = params.orgId;
  }
}
