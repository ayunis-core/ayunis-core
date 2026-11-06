import {
  AbstractCollectiveKnowledgeBase,
  type CollectiveKnowledgeBaseParams,
} from './collective-knowledge-base.entity';

/** Owned by the organization it belongs to (`orgId`). */
export class OrgKnowledgeBase extends AbstractCollectiveKnowledgeBase {
  constructor(params: CollectiveKnowledgeBaseParams) {
    super(params);
  }
}
