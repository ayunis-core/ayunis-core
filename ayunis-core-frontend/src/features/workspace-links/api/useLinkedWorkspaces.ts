import {
  useKnowledgeBaseLinksControllerLinkedWorkspaces,
  useSkillLinksControllerLinkedWorkspaces,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { LinkKind } from '@/features/workspace-links/model/types';

export function useLinkedWorkspaces(
  kind: LinkKind,
  id: string,
  enabled = true,
) {
  const skills = useSkillLinksControllerLinkedWorkspaces(id, {
    query: { enabled: enabled && kind === 'skill' },
  });
  const knowledgeBases = useKnowledgeBaseLinksControllerLinkedWorkspaces(id, {
    query: { enabled: enabled && kind === 'knowledgeBase' },
  });
  const { data } = kind === 'skill' ? skills : knowledgeBases;
  return {
    total: data?.total ?? 0,
    workspaces: data?.workspaces ?? [],
    isKnown: data !== undefined,
  };
}
