import type { UUID } from 'crypto';
import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class PersonalKnowledgeBase extends AbstractKnowledgeBase {
  readonly userId: UUID;

  constructor(params: AbstractKnowledgeBaseParams & { userId: UUID }) {
    super(params);
    this.userId = params.userId;
  }
}
