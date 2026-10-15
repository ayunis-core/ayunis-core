import type { UUID } from 'crypto';
import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class TeamKnowledgeBase extends AbstractKnowledgeBase {
  readonly teamId: UUID;
  readonly submittedByUserId: UUID | null;

  constructor(
    params: AbstractKnowledgeBaseParams & {
      teamId: UUID;
      submittedByUserId?: UUID | null;
    },
  ) {
    super(params);
    this.teamId = params.teamId;
    this.submittedByUserId = params.submittedByUserId ?? null;
  }
}
