import type { UUID } from 'crypto';
import {
  AbstractCollectiveKnowledgeBase,
  type CollectiveKnowledgeBaseParams,
} from './collective-knowledge-base.entity';

export class TeamKnowledgeBase extends AbstractCollectiveKnowledgeBase {
  readonly teamId: UUID;

  constructor(params: CollectiveKnowledgeBaseParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }
}
