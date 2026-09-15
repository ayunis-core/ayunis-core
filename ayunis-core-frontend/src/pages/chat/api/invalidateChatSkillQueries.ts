import type { QueryClient } from '@tanstack/react-query';
import {
  getSkillsControllerFindAllQueryKey,
  getThreadAiContextControllerGetAiContextQueryKey,
  getWorkspaceContextControllerFindContextQueryKey,
} from '@/shared/api';
import {
  personalSkillListParams,
  workspaceSkillListParams,
} from '@/shared/api/skill-scopes';

interface SkillCacheScope {
  threadId?: string;
  workspaceId?: string;
}

export function invalidateChatSkillQueries(
  queryClient: QueryClient,
  { threadId, workspaceId }: SkillCacheScope,
) {
  const listParams = workspaceId
    ? workspaceSkillListParams(workspaceId)
    : personalSkillListParams;
  void queryClient.invalidateQueries({
    queryKey: getSkillsControllerFindAllQueryKey(listParams),
  });
  if (threadId) {
    void queryClient.invalidateQueries({
      queryKey: getThreadAiContextControllerGetAiContextQueryKey(threadId),
    });
  }
  if (workspaceId) {
    void queryClient.invalidateQueries({
      queryKey: getWorkspaceContextControllerFindContextQueryKey(workspaceId),
    });
  }
}
