import type {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
} from '@/shared/api';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getThreadAiContextControllerGetAiContextQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  activeThreadRunsQueryKey,
  attachThreadRun,
  postRunMessage,
  registerActiveThreadRun,
  stopThreadRun,
  unregisterActiveThreadRun,
  type RunMessagePayload,
  type StartedRunRequest,
} from '@/features/thread-run';
import { redirectToLogin } from '@/shared/lib/redirect-to-login';
import { createFrameCoalescer } from '@/pages/chat/lib/frame-coalescer';

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
}

interface SendToolResultInput {
  toolId: string;
  toolName: string;
  result: string;
}

interface UseMessageSendParams {
  threadId: string;
  onMessageEvent?: (data: RunMessageResponseDto) => void;
  onMessageReceived?: () => void;
  onSessionEvent?: (data: RunSessionResponseDto) => void;
  onThreadEvent?: (data: RunThreadResponseDto) => void;
  onMasksEvent?: (data: RunMasksResponseDto) => void;
  onErrorEvent?: (data: RunErrorResponseDto) => void;
  onError?: (error: Error) => void;
  onComplete?: (failed: boolean) => void;
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

interface SendMessagePayload extends RunMessagePayload {
  startedRequest?: StartedRunRequest;
  /** Attaching to a run in progress; its failures are not send failures. */
  isAttach?: boolean;
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
    // eslint-disable-next-line sonarjs/cognitive-complexity
    async (payload: SendMessagePayload) => {
      let requestController: AbortController | null = null;
      let wasAborted = false;
      let hadError = false;
      let sessionExpired = false;
      const requestThreadId = payload.threadId;
      const requestParams = currentParamsRef.current;
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
      try {
        requestController =
          payload.startedRequest?.controller ?? new AbortController();
        registerActiveThreadRun(requestThreadId, requestController);
        // Cancelling cleans up the last message synchronously after aborting,
        // so already received snapshots must be applied before that.
        requestController.signal.addEventListener('abort', messageEvents.flush);

        const response = await (payload.startedRequest?.response ??
          postRunMessage(payload, requestController.signal));

        if (response.status === 401) {
          sessionExpired = true;
          hadError = true;
          redirectToLogin();
          return;
        }

        // Attaching found no run in progress: it ended in the meantime.
        if (response.status === 204) return;

        if (!response.ok) {
          const errorText = await response.text();
          console.error('HTTP error:', { status: response.status, errorText });
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const dispatchLine = (line: string) => {
          if (line.startsWith(':')) return;
          if (!line.startsWith('data: ')) return;
          try {
            const data = JSON.parse(line.slice(6)) as { type?: string };
            if (data.type === 'message') {
              messageEvents.push(data as RunMessageResponseDto);
              return;
            }
            messageEvents.flush();
            switch (data.type) {
              case 'session':
                getCurrentParams()?.onSessionEvent?.(
                  data as RunSessionResponseDto,
                );
                break;
              case 'thread': {
                const currentParams = getCurrentParams();
                if (currentParams) {
                  currentParams.onThreadEvent?.(data as RunThreadResponseDto);
                } else {
                  undeliveredFor(requestThreadId).thread =
                    data as RunThreadResponseDto;
                }
                break;
              }
              case 'masks': {
                const currentParams = getCurrentParams();
                if (currentParams) {
                  currentParams.onMasksEvent?.(data as RunMasksResponseDto);
                } else {
                  undeliveredFor(requestThreadId).masks =
                    data as RunMasksResponseDto;
                }
                break;
              }
              case 'error':
                hadError = true;
                requestParams.onErrorEvent?.(data as RunErrorResponseDto);
                break;
              case undefined:
              default:
                console.warn('Unknown SSE event type:', data.type);
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        };

        try {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });

            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              dispatchLine(line);
            }
          }
        } catch (readerError) {
          console.error('Error reading SSE stream:', readerError);
          throw readerError;
        }

        // Flush any bytes pending in the decoder (e.g. multi-byte UTF-8
        // codepoint split across the last chunk) and process the final
        // line in the buffer. Defensive: an upstream proxy may close the
        // connection after delivering a complete `data: …` line but
        // before its trailing `\n\n`, which would otherwise be dropped.
        buffer += decoder.decode();
        if (buffer.length > 0) {
          for (const line of buffer.split('\n')) {
            dispatchLine(line);
          }
        }
      } catch (error) {
        console.error('Error in sendMessage', error);

        if (error instanceof Error && error.name === 'AbortError') {
          wasAborted = true;
          return;
        }

        hadError = true;

        if (payload.isAttach) throw error;

        if (error instanceof Error) {
          // Handle specific error status codes
          if (error.message.includes('IMAGE_UPLOADS_BUSY')) {
            // Must precede the generic 429 branch, which reports a quota.
            showError(t('chat.imageUploadsBusy'));
          } else if (error.message.includes('429')) {
            // Try to extract retry time from error response
            const retryMatch = /retryAfterSeconds[":]+(\d+)/.exec(
              error.message,
            );
            const retryMinutes = retryMatch
              ? Math.ceil(parseInt(retryMatch[1], 10) / 60)
              : null;
            showError(
              retryMinutes
                ? t('chat.errorQuotaExceededWithTime', {
                    minutes: retryMinutes,
                  })
                : t('chat.errorQuotaExceeded'),
            );
          } else if (error.message.includes('ACADEMY_CERTIFICATE_REQUIRED')) {
            // Must precede the generic 403 branch, which would otherwise tell a
            // blocked user to upgrade to Pro. The thrown message interpolates
            // the response body, so the error code is present in it.
            showError(t('chat.academyCertificateRequiredError'));
          } else if (error.message.includes('403')) {
            showError(t('chat.upgradeToProError'));
          } else {
            requestParams.onError?.(error);
          }
        }
      } finally {
        messageEvents.flush();
        // The saved thread is refetched below, which supersedes anything
        // still waiting for its chat to reopen.
        undeliveredByThread.delete(requestThreadId);
        if (requestController) {
          unregisterActiveThreadRun(requestThreadId, requestController);
        }

        // Only invalidate queries if the request completed normally (not aborted)
        // When aborted, we keep the optimistic local state to avoid race conditions
        // with the backend's async save operation
        if (!wasAborted) {
          requestParams.onComplete?.(hadError);
          if (!sessionExpired) {
            // Await the post-save server state unless navigation is already
            // handing an expired session back to login.
            await refreshThreadQueriesAfterRun(queryClient, requestThreadId);
          }
        }
      }
    },
    [t, queryClient],
  );

  const sendTextMessage = useCallback(
    (input: SendMessageInput) => {
      const payload: SendMessagePayload = {
        threadId: params.threadId,
        text: input.text,
        streaming: true,
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

  const attach = useCallback(() => {
    const controller = new AbortController();
    return sendMessage({
      threadId: params.threadId,
      isAttach: true,
      startedRequest: {
        controller,
        response: attachThreadRun(params.threadId, controller.signal),
      },
    });
  }, [params.threadId, sendMessage]);

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
    attach,
    abort,
  };
}
