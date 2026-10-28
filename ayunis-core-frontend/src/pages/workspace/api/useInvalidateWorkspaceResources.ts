import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  getWorkspaceContextControllerFindContextQueryKey,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { workspaceKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { workspaceSkillListParams } from '@/shared/api/skill-scopes';

export function useInvalidateWorkspaceResources(workspaceId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all(
      [
        getWorkspaceContextControllerFindContextQueryKey(workspaceId),
        getSkillsControllerFindAllQueryKey(
          workspaceSkillListParams(workspaceId),
        ),
        getKnowledgeBasesControllerFindAllQueryKey(
          workspaceKnowledgeBaseListParams(workspaceId),
        ),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    await router.invalidate({
      filter: ({ params }) =>
        'workspaceId' in params && params.workspaceId === workspaceId,
    });
  };
}
