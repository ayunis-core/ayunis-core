import { Brackets } from 'typeorm';
import type { CollectiveKnowledgeBaseScope } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';

export function usableCollectiveKnowledgeBases(
  scope: Pick<CollectiveKnowledgeBaseScope, 'orgId' | 'teamIds'>,
): Brackets {
  return new Brackets((usable) => {
    usable.where(
      '(knowledgeBase.orgId = :scopeOrgId AND knowledgeBase.userId IS NULL AND knowledgeBase.workspaceId IS NULL AND knowledgeBase.teamId IS NULL)',
      { scopeOrgId: scope.orgId },
    );
    if (scope.teamIds.length > 0) {
      usable.orWhere(
        '(knowledgeBase.orgId = :scopeOrgId AND knowledgeBase.teamId IN (:...scopeTeamIds))',
        { scopeOrgId: scope.orgId, scopeTeamIds: scope.teamIds },
      );
    }
  });
}
