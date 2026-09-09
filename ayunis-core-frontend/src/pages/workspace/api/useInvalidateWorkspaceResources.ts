import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getWorkspaceContextControllerFindContextQueryKey,
  getWorkspaceContextControllerListSkillsQueryKey,
  getWorkspaceContextControllerListKnowledgeBasesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useInvalidateWorkspaceResources(workspaceId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all(
      [
        getWorkspaceContextControllerFindContextQueryKey(workspaceId),
        getWorkspaceContextControllerListSkillsQueryKey(workspaceId),
        getWorkspaceContextControllerListKnowledgeBasesQueryKey(workspaceId),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    await router.invalidate({
      filter: ({ params }) =>
        'workspaceId' in params && params.workspaceId === workspaceId,
    });
  };
}
