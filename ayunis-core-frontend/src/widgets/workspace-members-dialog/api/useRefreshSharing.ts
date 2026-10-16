import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getWorkspaceSharingControllerCandidatesQueryKey,
  getWorkspaceSharingControllerSharingQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

function isWorkspaceLinkKey(queryKey: readonly unknown[], workspaceId: string) {
  const [path] = queryKey;
  return (
    typeof path === 'string' &&
    path.startsWith(`/workspaces/${workspaceId}/link`)
  );
}

export function useRefreshSharing(workspaceId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await Promise.all([
      ...[
        getWorkspaceSharingControllerSharingQueryKey(workspaceId),
        getWorkspaceSharingControllerCandidatesQueryKey(workspaceId),
        getWorkspacesControllerFindOneQueryKey(workspaceId),
        getWorkspacesControllerFindAllQueryKey(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => isWorkspaceLinkKey(queryKey, workspaceId),
      }),
    ]);
    await router.invalidate();
  };
}
