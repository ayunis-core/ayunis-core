import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export class KnowledgeBaseAssignment {
  public readonly id: UUID;
  public readonly knowledgeBase: KnowledgeBaseSummary;
  public readonly originSkillId?: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    knowledgeBase: KnowledgeBaseSummary;
    originSkillId?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.knowledgeBase = params.knowledgeBase;
    this.originSkillId = params.originSkillId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
