import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getKnowledgeBaseLinksControllerLinkableQueryKey,
  getKnowledgeBaseLinksControllerLinkedQueryKey,
  getSkillLinksControllerLinkableQueryKey,
  getSkillLinksControllerLinkedQueryKey,
  getWorkspaceContextControllerFindContextQueryKey,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { LinkKind } from '@/features/workspace-links/model/types';

function isLinkedWorkspacesKey(queryKey: readonly unknown[]): boolean {
  const [path] = queryKey;
  return typeof path === 'string' && path.endsWith('/linked-workspaces');
}

export function useRefreshLinks(kind: LinkKind, workspaceId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const listKeys =
    kind === 'skill'
      ? [
          getSkillLinksControllerLinkedQueryKey(workspaceId),
          getSkillLinksControllerLinkableQueryKey(workspaceId),
        ]
      : [
          getKnowledgeBaseLinksControllerLinkedQueryKey(workspaceId),
          getKnowledgeBaseLinksControllerLinkableQueryKey(workspaceId),
        ];

  return async () => {
    await Promise.all([
      ...[
        ...listKeys,
        getWorkspaceContextControllerFindContextQueryKey(workspaceId),
        getWorkspacesControllerFindAllQueryKey(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => isLinkedWorkspacesKey(queryKey),
      }),
    ]);
    await router.invalidate();
  };
}
