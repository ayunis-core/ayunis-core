import type { UUID } from 'crypto';
import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class TeamKnowledgeBase extends AbstractKnowledgeBase {
  readonly teamId: UUID;

  constructor(params: AbstractKnowledgeBaseParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }
}
