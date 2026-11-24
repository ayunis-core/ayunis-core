import type {
  GetThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client';
import { showError, showInfo } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getThreadAiContextControllerGetAiContextQueryKey,
  getMcpToolAllowancesControllerListQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
} from '@ayunis/api-client/endpoints';
import {
  activeThreadRunsQueryKey,
  threadRunLifecycle,
} from '@/features/thread-run';
import { redirectToLogin } from '@/shared/lib/redirect-to-login';
import {
  useChatRunLifecycle,
  type ChatRunParams,
  type RunEndpoints,
  type RunExecutionRequest,
  type RunRequestObserver,
} from '@ayunis/chat/runs';
import { createRunFunnelTracker } from '@/pages/chat/lib/run-funnel-tracking';

async function refreshThreadQueriesAfterRun(
  queryClient: QueryClient,
  threadId: string,
): Promise<void> {
  // Replace stale polls without letting their older responses overwrite saved
  // output. Refetch cancels and replaces in one operation, so upload callers
  // awaiting that query continue waiting for fresh data instead of reverted data.
  const threadQueryKey = getThreadsControllerFindOneQueryKey(threadId);
  await queryClient.refetchQueries(
    { queryKey: threadQueryKey, exact: true },
    { cancelRefetch: true },
  );

  [
    getThreadsControllerFindAllQueryKey(),
    activeThreadRunsQueryKey(),
    getArtifactsControllerFindByThreadQueryKey(threadId),
    getThreadAiContextControllerGetAiContextQueryKey(threadId),
  ].forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });

  // Individual artifact queries are keyed outside the thread, so the editor
  // panel only refreshes after an AI edit if they are invalidated too.
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return (
        typeof key === 'string' &&
        key.startsWith('/artifacts/') &&
        !key.startsWith('/artifacts/thread/')
      );
    },
  });
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

export function useMessageSend(
  params: ChatRunParams,
  transport?: RunEndpoints,
) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const observeRequest = useCallback(
    (
      { threadId, isAttach }: RunExecutionRequest,
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
            case 'error':
            case 'thread':
            case 'masks':
              break;
          }
        },
        onUnauthorized: redirectToLogin,
        onError: (error) => notifySendFailure(error, t, onError),
        async onComplete({ failed, unauthorized }) {
          if (!failed) runFunnel.trackDelivered();
          if (!unauthorized) {
            await refreshThreadQueriesAfterRun(queryClient, threadId);
          }
        },
      };
    },
    [t, queryClient],
  );

  const run = useChatRunLifecycle(threadRunLifecycle, params, {
    transport,
    observeRequest,
  });
  const { sendToolCallDecisions: sendDecisions } = run;
  const sendToolCallDecisions = useCallback(
    async (decisions: ToolCallDecisionDto[]) => {
      await sendDecisions(decisions);
      if (
        decisions.some((decision) => decision.approved && decision.alwaysAllow)
      ) {
        void queryClient.invalidateQueries({
          queryKey: getMcpToolAllowancesControllerListQueryKey(),
        });
      }
    },
    [sendDecisions, queryClient],
  );

  return { ...run, sendToolCallDecisions };
}
