import {
  useKnowledgeBaseLinksControllerLinkable,
  useSkillLinksControllerLinkable,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillLinkSummaryDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { toLinkableSections } from '@/features/workspace-links/lib/linkable-sections';
import type {
  LinkableItem,
  LinkKind,
} from '@/features/workspace-links/model/types';

function fromSkill(skill: SkillLinkSummaryDto): LinkableItem {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.shortDescription,
    owner: skill.owner,
  };
}

export function useLinkableSections(
  kind: LinkKind,
  workspaceId: string,
  enabled: boolean,
) {
  const skills = useSkillLinksControllerLinkable(workspaceId, undefined, {
    query: { enabled: enabled && kind === 'skill' },
  });
  const knowledgeBases = useKnowledgeBaseLinksControllerLinkable(
    workspaceId,
    undefined,
    { query: { enabled: enabled && kind === 'knowledgeBase' } },
  );
  if (kind === 'skill') {
    const data = skills.data;
    return {
      sections: data
        ? toLinkableSections({
            own: data.own.map(fromSkill),
            team: data.team.map(fromSkill),
            org: data.org.map(fromSkill),
          })
        : [],
      isLoading: skills.isLoading,
    };
  }
  return {
    sections: knowledgeBases.data
      ? toLinkableSections(knowledgeBases.data)
      : [],
    isLoading: knowledgeBases.isLoading,
  };
}
