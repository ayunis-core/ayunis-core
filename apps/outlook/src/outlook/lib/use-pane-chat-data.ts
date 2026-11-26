import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerDelete,
  threadsControllerUpdateTitle,
  useThreadsControllerFindAll,
  useModelsControllerIsEmbeddingModelEnabled,
  useThreadsControllerFindOne,
  useActiveRunsControllerFindActive,
} from '@ayunis/api-client/endpoints';
import { SessionClient, ThreadType } from '@ayunis/api-client/schemas';
import type { ChatCapabilities } from '@ayunis/chat/surface';

export const PANE_HISTORY_PAGE_SIZE = 20;

type DocumentAttachmentCapabilities = Readonly<
  Pick<ChatCapabilities, 'fileUpload' | 'modelSelection'>
>;

export function usePaneHistory(offset: number) {
  return useThreadsControllerFindAll({
    client: SessionClient.outlook,
    type: ThreadType.chat,
    limit: PANE_HISTORY_PAGE_SIZE,
    offset,
  });
}

export function usePaneDocumentAttachments({
  fileUpload,
  modelSelection,
}: DocumentAttachmentCapabilities) {
  const canReadEmbeddingStatus = Boolean(fileUpload && modelSelection);
  const { data } = useModelsControllerIsEmbeddingModelEnabled({
    query: { enabled: canReadEmbeddingStatus },
  });
  return resolvePaneDocumentAttachments(
    { fileUpload, modelSelection },
    data?.isEmbeddingModelEnabled,
  );
}

export function resolvePaneDocumentAttachments(
  { fileUpload, modelSelection }: DocumentAttachmentCapabilities,
  embeddingEnabled: boolean | undefined,
) {
  if (!fileUpload) return false;
  // The upload endpoint checks readiness for sessions without models:read.
  return modelSelection ? embeddingEnabled === true : true;
}

export function usePaneThread(threadId: string | undefined) {
  return useThreadsControllerFindOne(threadId ?? '', {
    query: {
      enabled: Boolean(threadId),
      refetchInterval: (query) =>
        query.state.data?.sources.some(({ status }) => status === 'processing')
          ? 2000
          : false,
    },
  });
}

export function usePaneActiveRun(threadId: string | undefined) {
  const active = useActiveRunsControllerFindActive({
    query: { enabled: Boolean(threadId) },
  });
  return {
    run: active.data?.find((run) => run.threadId === threadId),
    dataUpdatedAt: active.dataUpdatedAt,
    isFetching: Boolean(threadId && active.isFetching),
  };
}

export function usePaneThreadActions() {
  const queryClient = useQueryClient();
  const refreshThread = useCallback(
    (id: string) =>
      queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(id),
      }),
    [queryClient],
  );
  const refreshHistory = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, [queryClient]);
  const refreshRun = useCallback(
    (id: string) => {
      void refreshThread(id);
      refreshHistory();
      void queryClient.invalidateQueries({
        queryKey: getActiveRunsControllerFindActiveQueryKey(),
      });
    },
    [queryClient, refreshHistory, refreshThread],
  );

  return {
    refreshThread,
    refreshRun,
    async rename(id: string, title: string, signal: AbortSignal) {
      await threadsControllerUpdateTitle(id, { title }, signal);
      await refreshThread(id);
      refreshHistory();
    },
    async remove(id: string, signal: AbortSignal) {
      await threadsControllerDelete(id, signal);
      queryClient.removeQueries({
        queryKey: getThreadsControllerFindOneQueryKey(id),
        exact: true,
      });
      refreshHistory();
    },
  };
}
