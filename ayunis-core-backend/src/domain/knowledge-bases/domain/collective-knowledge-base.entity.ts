import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export type CollectiveKnowledgeBaseParams = AbstractKnowledgeBaseParams & {
  isActive?: boolean;
};

/**
 * A knowledge base owned by a team or the organization. Its activation is
 * global: it applies to every user with access, so it lives on the knowledge
 * base instead of in per-user activation rows.
 */
export abstract class AbstractCollectiveKnowledgeBase extends AbstractKnowledgeBase {
  isActive: boolean;

  protected constructor(params: CollectiveKnowledgeBaseParams) {
    super(params);
    this.isActive = params.isActive ?? false;
  }
}
