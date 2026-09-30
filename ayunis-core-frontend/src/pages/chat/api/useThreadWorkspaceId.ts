import { useThreadsControllerFindOne } from '@/shared/api';

/**
 * Chat widgets only receive the thread id. ChatPage keeps the thread itself in
 * the query cache under the same key, so `staleTime: Infinity` reads it without
 * issuing a second request.
 */
export function useThreadWorkspaceId(threadId?: string): string | null {
  const query = useThreadsControllerFindOne(threadId ?? '', {
    query: { enabled: !!threadId, staleTime: Infinity },
  });

  return query.data?.workspaceId ?? null;
}
