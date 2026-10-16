import type { UUID } from 'crypto';
import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class OrgKnowledgeBase extends AbstractKnowledgeBase {
  readonly ownerType = 'org' as const;
  readonly submittedByUserId: UUID | null;

  constructor(
    params: AbstractKnowledgeBaseParams & { submittedByUserId?: UUID | null },
  ) {
    super(params);
    this.submittedByUserId = params.submittedByUserId ?? null;
  }
}
