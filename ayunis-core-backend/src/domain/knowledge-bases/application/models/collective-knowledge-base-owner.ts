import type { CollectiveOwner } from 'src/domain/ownership/application/models/collective-owner';
import type {
  CollectiveKnowledgeBase,
  KnowledgeBase,
} from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';

export function isCollectiveKnowledgeBase(
  knowledgeBase: KnowledgeBase,
): knowledgeBase is CollectiveKnowledgeBase {
  return (
    knowledgeBase instanceof TeamKnowledgeBase ||
    knowledgeBase instanceof OrgKnowledgeBase
  );
}

export function collectiveOwnerOfKnowledgeBase(
  knowledgeBase: CollectiveKnowledgeBase,
): CollectiveOwner {
  return knowledgeBase instanceof TeamKnowledgeBase
    ? {
        type: 'team',
        teamId: knowledgeBase.teamId,
        orgId: knowledgeBase.orgId,
      }
    : { type: 'org', orgId: knowledgeBase.orgId };
}
