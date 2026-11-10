import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getWorkspaceMembersControllerListCandidatesQueryKey,
  getWorkspaceMembersControllerListQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Refreshes the member list and the workspace itself: changing their own role
 * changes which workspace controls the caller sees.
 */
export function useInvalidateWorkspaceMembership(workspaceId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await Promise.all(
      [
        getWorkspaceMembersControllerListQueryKey(workspaceId),
        getWorkspaceMembersControllerListCandidatesQueryKey(workspaceId),
        getWorkspacesControllerFindOneQueryKey(workspaceId),
        getWorkspacesControllerFindAllQueryKey(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    await router.invalidate();
  };
}
