import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class OrgKnowledgeBase extends AbstractKnowledgeBase {
  readonly ownerType = 'org' as const;

  constructor(params: AbstractKnowledgeBaseParams) {
    super(params);
  }
}
