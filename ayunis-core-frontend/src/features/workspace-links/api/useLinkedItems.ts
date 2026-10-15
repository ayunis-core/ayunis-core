import {
  useKnowledgeBaseLinksControllerLinked,
  useSkillLinksControllerLinked,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  LinkedItem,
  LinkKind,
} from '@/features/workspace-links/model/types';

export function useLinkedItems(kind: LinkKind, workspaceId: string) {
  const skills = useSkillLinksControllerLinked(workspaceId, undefined, {
    query: { enabled: kind === 'skill' },
  });
  const knowledgeBases = useKnowledgeBaseLinksControllerLinked(
    workspaceId,
    undefined,
    { query: { enabled: kind === 'knowledgeBase' } },
  );
  const items: LinkedItem[] =
    kind === 'skill'
      ? (skills.data?.data ?? []).map(({ skill, linkedBy }) => ({
          id: skill.id,
          name: skill.name,
          description: skill.shortDescription,
          owner: skill.owner,
          linkedBy,
        }))
      : (knowledgeBases.data?.data ?? []).map(
          ({ knowledgeBase, linkedBy }) => ({
            ...knowledgeBase,
            linkedBy,
          }),
        );
  const query = kind === 'skill' ? skills : knowledgeBases;
  return { items, isLoading: query.isLoading };
}
