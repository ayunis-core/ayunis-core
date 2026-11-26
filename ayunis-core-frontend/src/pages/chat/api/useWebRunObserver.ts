import type { GetThreadResponseDto } from '@ayunis/api-client';
import { showError, showInfo } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import {
  matchQuery,
  type Query,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getThreadAiContextControllerGetAiContextQueryKey,
  getMcpToolAllowancesControllerListQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
} from '@ayunis/api-client/endpoints';
import { activeThreadRunsQueryKey } from '@/features/thread-run';
import { redirectToLogin } from '@/shared/lib/redirect-to-login';
import type {
  ChatRunParams,
  RunExecutionRequest,
  RunRequestObserver,
} from '@ayunis/chat/runs';
import { createRunFunnelTracker } from '@/pages/chat/lib/run-funnel-tracking';

function runResultScope(threadId: string) {
  const keys = [
    getThreadsControllerFindAllQueryKey(),
    activeThreadRunsQueryKey(),
    getArtifactsControllerFindByThreadQueryKey(threadId),
    getThreadAiContextControllerGetAiContextQueryKey(threadId),
  ];
  return {
    predicate(query: Query) {
      if (keys.some((queryKey) => matchQuery({ queryKey }, query))) return true;
      // Individual artifact queries are keyed outside the thread.
      const key = query.queryKey[0];
      return (
        typeof key === 'string' &&
        key.startsWith('/artifacts/') &&
        !key.startsWith('/artifacts/thread/')
      );
    },
  };
}

async function refreshThreadQueriesAfterRun(
  queryClient: QueryClient,
  threadId: string,
  session: AbortSignal,
): Promise<void> {
  // Replace stale polls without letting their older responses overwrite saved
  // output. Refetch cancels and replaces in one operation, so upload callers
  // awaiting that query continue waiting for fresh data instead of reverted data.
  const thread = {
    queryKey: getThreadsControllerFindOneQueryKey(threadId),
    exact: true,
  };
  const results = runResultScope(threadId);
  const cancel = () =>
    void queryClient.cancelQueries({
      predicate: (query) =>
        matchQuery(thread, query) || results.predicate(query),
    });
  session.addEventListener('abort', cancel);
  try {
    await queryClient.refetchQueries(thread, { cancelRefetch: true });
    if (!session.aborted) await queryClient.invalidateQueries(results);
  } finally {
    session.removeEventListener('abort', cancel);
  }
}

function notifySendFailure(
  error: Error,
  t: ReturnType<typeof useTranslation<'chat'>>['t'],
  onError?: (error: Error) => void,
): void {
  if (error.message.includes('IMAGE_UPLOADS_BUSY')) {
    showError(t('chat.imageUploadsBusy'));
  } else if (error.message.includes('429')) {
    const retryMatch = /retryAfterSeconds[":]+(\d+)/.exec(error.message);
    const retryMinutes = retryMatch
      ? Math.ceil(parseInt(retryMatch[1], 10) / 60)
      : null;
    showError(
      retryMinutes
        ? t('chat.errorQuotaExceededWithTime', { minutes: retryMinutes })
        : t('chat.errorQuotaExceeded'),
    );
  } else if (error.message.includes('ACADEMY_CERTIFICATE_REQUIRED')) {
    showError(t('chat.academyCertificateRequiredError'));
  } else if (error.message.includes('403')) {
    showError(t('chat.upgradeToProError'));
  } else {
    onError?.(error);
  }
}

export function useWebRunObserver() {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  return useCallback(
    (
      { threadId, isAttach, decisions }: RunExecutionRequest,
      voiceInput: boolean,
      onError: ChatRunParams['onError'],
    ): RunRequestObserver => {
      const runFunnel = createRunFunnelTracker({
        isAttach: isAttach ?? false,
        voiceInput,
        getThread: () =>
          queryClient.getQueryData<GetThreadResponseDto>(
            getThreadsControllerFindOneQueryKey(threadId),
          ),
      });
      const refreshToolAllowances = () => {
        if (
          decisions?.some(
            (decision) => decision.approved && decision.alwaysAllow,
          )
        ) {
          void queryClient.invalidateQueries({
            queryKey: getMcpToolAllowancesControllerListQueryKey(),
          });
        }
      };
      return {
        onEvent(event) {
          switch (event.type) {
            case 'message':
              runFunnel.observeMessage(event.message);
              break;
            case 'session':
              if (event.streaming === false) runFunnel.observeRunEnd();
              break;
            case 'integration_warning':
              showInfo(
                t('chat.integrationUnavailable', {
                  name: event.integrationName,
                }),
              );
              void queryClient.invalidateQueries({
                queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
              });
              break;
            case 'thread':
              void queryClient.invalidateQueries({
                queryKey: getThreadsControllerFindAllQueryKey(),
              });
              break;
            case 'error':
            case 'masks':
              break;
          }
        },
        onAbort: refreshToolAllowances,
        onUnauthorized: redirectToLogin,
        onError: (error) => notifySendFailure(error, t, onError),
        async onComplete({ failed, unauthorized }, session) {
          if (!failed) runFunnel.trackDelivered();
          refreshToolAllowances();
          if (!unauthorized && !session.aborted) {
            await refreshThreadQueriesAfterRun(queryClient, threadId, session);
          }
        },
      };
    },
    [t, queryClient],
  );
}
