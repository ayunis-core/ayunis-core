import type {
  GetThreadResponseDto,
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client';
import { showError, showInfo } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback, useLayoutEffect, useRef } from 'react';
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
  threadRunEndpoints,
  stopThreadRun,
  type StartedRunRequest,
} from '@/features/thread-run';
import { redirectToLogin } from '@/shared/lib/redirect-to-login';
import {
  createFrameCoalescer,
  executeRun,
  type RunEvent,
  type RunExecutionRequest,
} from '@ayunis/chat/runs';
import { createRunFunnelTracker } from '@/pages/chat/lib/run-funnel-tracking';

export interface PendingImage {
  file: File;
  altText?: string;
}

export interface SendMessageInput {
  text: string;
  images?: PendingImage[];
  skillId?: string;
  /** Already sent for this message; its response is read instead of sending again. */
  startedRequest?: StartedRunRequest;
  /** The prompt contains text from a successful transcription. */
  voiceInput?: boolean;
}

interface SendToolResultInput {
  toolId: string;
  toolName: string;
  result: string;
}

export interface UseMessageSendParams {
  threadId: string;
  onMessageEvent?: (data: RunMessageResponseDto) => void;
  onMessageReceived?: () => void;
  onSessionEvent?: (data: RunSessionResponseDto) => void;
  onThreadEvent?: (data: RunThreadResponseDto) => void;
  onMasksEvent?: (data: RunMasksResponseDto) => void;
  onErrorEvent?: (data: RunErrorResponseDto) => void;
  onError?: (error: Error) => void;
  onComplete?: (failed: boolean, reason?: 'reattach-failed') => void;
}

const mountedParamsByThread = new Map<string, UseMessageSendParams>();

/**
 * What a run streamed while its chat was not open. Message events are full
 * snapshots and masks the full dictionary, so the latest of each is enough
 * to bring a reopened chat up to date.
 */
interface UndeliveredRunEvents {
  masks?: RunMasksResponseDto;
  thread?: RunThreadResponseDto;
  messages: Map<string, RunMessageResponseDto>;
}

const undeliveredByThread = new Map<string, UndeliveredRunEvents>();

function undeliveredFor(threadId: string): UndeliveredRunEvents {
  let undelivered = undeliveredByThread.get(threadId);
  if (!undelivered) {
    undelivered = { messages: new Map() };
    undeliveredByThread.set(threadId, undelivered);
  }
  return undelivered;
}

function deliverUndelivered(params: UseMessageSendParams): void {
  const undelivered = undeliveredByThread.get(params.threadId);
  if (!undelivered) return;
  undeliveredByThread.delete(params.threadId);
  if (undelivered.masks) params.onMasksEvent?.(undelivered.masks);
  if (undelivered.thread) params.onThreadEvent?.(undelivered.thread);
  undelivered.messages.forEach((event) => params.onMessageEvent?.(event));
}

interface SendMessagePayload extends RunExecutionRequest {
  voiceInput?: boolean;
}

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

export function useMessageSend(params: UseMessageSendParams) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const currentParamsRef = useRef(params);
  useLayoutEffect(() => {
    currentParamsRef.current = params;
    mountedParamsByThread.set(params.threadId, params);
    deliverUndelivered(params);
    return () => {
      if (mountedParamsByThread.get(params.threadId) === params) {
        mountedParamsByThread.delete(params.threadId);
      }
    };
  }, [params]);

  const sendMessage = useCallback(
    ({ voiceInput, ...payload }: SendMessagePayload) => {
      const requestThreadId = payload.threadId;
      const requestParams = currentParamsRef.current;
      const runFunnel = createRunFunnelTracker({
        isAttach: payload.isAttach ?? false,
        voiceInput: voiceInput ?? false,
        getThread: () =>
          queryClient.getQueryData<GetThreadResponseDto>(
            getThreadsControllerFindOneQueryKey(requestThreadId),
          ),
      });
      const getCurrentParams = () =>
        mountedParamsByThread.get(requestThreadId) ?? null;
      // Each event carries a full message snapshot, so only the newest one per
      // message needs to reach React in a frame. Other events and the end of
      // the run flush first to keep their order relative to the messages.
      const messageEvents = createFrameCoalescer<RunMessageResponseDto>(
        (event) => event.message.id,
        (events) => {
          requestParams.onMessageReceived?.();
          const currentParams = getCurrentParams();
          if (!currentParams) {
            const { messages } = undeliveredFor(requestThreadId);
            events.forEach((event) => messages.set(event.message.id, event));
            return;
          }
          events.forEach((event) => currentParams.onMessageEvent?.(event));
        },
      );
      const onEvent = (event: RunEvent): void => {
        if (event.type === 'message') {
          messageEvents.push(event);
          runFunnel.observeMessage(event.message);
          return;
        }
        messageEvents.flush();
        const currentParams = getCurrentParams();
        switch (event.type) {
          case 'session':
            if (event.streaming === false) runFunnel.observeRunEnd();
            currentParams?.onSessionEvent?.(event);
            break;
          case 'thread':
            if (currentParams) currentParams.onThreadEvent?.(event);
            else undeliveredFor(requestThreadId).thread = event;
            break;
          case 'masks':
            if (currentParams) currentParams.onMasksEvent?.(event);
            else undeliveredFor(requestThreadId).masks = event;
            break;
          case 'integration_warning':
            showInfo(
              t('chat.integrationUnavailable', { name: event.integrationName }),
            );
            void queryClient.invalidateQueries({
              queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
            });
            break;
          case 'error':
            requestParams.onErrorEvent?.(event);
            break;
        }
      };

      return executeRun(threadRunEndpoints, payload, {
        onEvent,
        onUnauthorized: redirectToLogin,
        onError: (error) => notifySendFailure(error, t, requestParams.onError),
        onAbort: messageEvents.flush,
        onCleanup: () => {
          messageEvents.flush();
          undeliveredByThread.delete(requestThreadId);
        },
        onComplete: async ({ failed, unauthorized, reattachFailed }) => {
          if (!failed) runFunnel.trackDelivered();
          if (reattachFailed)
            requestParams.onComplete?.(true, 'reattach-failed');
          else requestParams.onComplete?.(failed);
          if (!unauthorized) {
            await refreshThreadQueriesAfterRun(queryClient, requestThreadId);
          }
        },
      });
    },
    [t, queryClient],
  );

  const sendTextMessage = useCallback(
    (input: SendMessageInput) => {
      const payload: SendMessagePayload = {
        threadId: params.threadId,
        text: input.text,
        streaming: true,
        voiceInput: input.voiceInput,
      };

      // Add images and their alt texts if present
      if (input.images && input.images.length > 0) {
        payload.images = input.images.map((img) => img.file);
        payload.imageAltTexts = input.images.map((img) => img.altText ?? '');
      }

      if (input.skillId) {
        payload.skillId = input.skillId;
      }

      if (input.startedRequest) {
        payload.startedRequest = input.startedRequest;
      }

      return sendMessage(payload);
    },
    [params.threadId, sendMessage],
  );

  const sendToolResult = useCallback(
    (input: SendToolResultInput) => {
      const payload: SendMessagePayload = {
        threadId: params.threadId,
        toolResult: input,
        streaming: true,
      };

      return sendMessage(payload);
    },
    [params.threadId, sendMessage],
  );

  const sendToolCallDecisions = useCallback(
    async (decisions: ToolCallDecisionDto[]) => {
      await sendMessage({
        threadId: params.threadId,
        decisions,
        streaming: true,
      });
      if (
        decisions.some((decision) => decision.approved && decision.alwaysAllow)
      ) {
        void queryClient.invalidateQueries({
          queryKey: getMcpToolAllowancesControllerListQueryKey(),
        });
      }
    },
    [params.threadId, sendMessage, queryClient],
  );

  const attach = useCallback(
    () => sendMessage({ threadId: params.threadId, isAttach: true }),
    [params.threadId, sendMessage],
  );

  const abort = useCallback(() => {
    stopThreadRun(params.threadId);

    // Don't invalidate queries immediately on abort
    // The backend will save the message asynchronously, and we'll get the update
    // through normal query invalidation in the finally block
    // This prevents race conditions where we refetch before backend finishes saving
  }, [params.threadId]);

  return {
    sendTextMessage,
    sendToolResult,
    sendToolCallDecisions,
    attach,
    abort,
  };
}
