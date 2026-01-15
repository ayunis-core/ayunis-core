import {
  type RunSessionResponseDto,
  type RunMessageResponseDto,
  type RunErrorResponseDto,
  type RunThreadResponseDto,
} from '@/shared/api';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback, useRef } from 'react';
import config from '@/shared/config';
import { useQueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export interface PendingImage {
  file: File;
  altText?: string;
}

export interface SendMessageInput {
  text: string;
  images?: PendingImage[];
}

interface SendToolResultInput {
  toolId: string;
  toolName: string;
  result: string;
}

interface UseMessageSendParams {
  threadId: string;
  onMessageEvent?: (data: RunMessageResponseDto) => void;
  onSessionEvent?: (data: RunSessionResponseDto) => void;
  onThreadEvent?: (data: RunThreadResponseDto) => void;
  onErrorEvent?: (data: RunErrorResponseDto) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface SendMessagePayload {
  threadId: string;
  text?: string;
  images?: File[];
  imageAltTexts?: string[];
  toolResult?: SendToolResultInput;
  streaming?: boolean;
}

export function useMessageSend(params: UseMessageSendParams) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);
  const wasAbortedRef = useRef(false);

  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      try {
        // Clean up any existing connection
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        isLoadingRef.current = true;
        wasAbortedRef.current = false;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const url = `${config.api.baseUrl}/runs/send-message`;

        // Build FormData for multipart request
        const formData = new FormData();
        formData.append('threadId', payload.threadId);

        if (payload.text !== undefined) {
          formData.append('text', payload.text);
        }

        if (payload.images && payload.images.length > 0) {
          for (const image of payload.images) {
            formData.append('images', image);
          }
        }

        if (payload.imageAltTexts && payload.imageAltTexts.length > 0) {
          formData.append(
            'imageAltTexts',
            JSON.stringify(payload.imageAltTexts),
          );
        }

        if (payload.toolResult) {
          formData.append('toolResult', JSON.stringify(payload.toolResult));
        }

        if (payload.streaming !== undefined) {
          formData.append('streaming', String(payload.streaming));
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            // Don't set Content-Type - browser will set it with boundary for multipart
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          credentials: 'include',
          body: formData,
          signal,
        });

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
        let _eventCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });

            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              // Handle SSE comment lines
              if (line.startsWith(':')) {
                continue;
              }

              // Handle SSE data lines
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = line.slice(6);
                  const data = JSON.parse(jsonData) as { type?: string };
                  _eventCount++;

                  switch (data.type) {
                    case 'session':
                      params.onSessionEvent?.(data as RunSessionResponseDto);
                      break;
                    case 'message':
                      params.onMessageEvent?.(data as RunMessageResponseDto);
                      console.log('Message', data);
                      break;
                    case 'thread':
                      params.onThreadEvent?.(data as RunThreadResponseDto);
                      break;
                    case 'error':
                      params.onErrorEvent?.(data as RunErrorResponseDto);
                      console.log('Error', data);
                      break;
                    default:
                      console.warn('Unknown SSE event type:', data.type);
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', line, parseError);
                }
              }
            }
          }
        } catch (readerError) {
          console.error('Error reading SSE stream:', readerError);
          throw readerError;
        }

        params.onComplete?.();
      } catch (error) {
        console.error('Error in sendMessage', error);

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            wasAbortedRef.current = true;
            return; // Request was cancelled, don't show error
          }

          // Handle specific error status codes
          if (error.message.includes('429')) {
            // Try to extract retry time from error response
            const retryMatch = error.message.match(
              /retryAfterSeconds[":]+(\d+)/,
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
          } else if (error.message.includes('403')) {
            showError(t('chat.upgradeToProError'));
          } else {
            params.onError?.(error);
          }
        }
      } finally {
        isLoadingRef.current = false;

        // Only invalidate queries if the request completed normally (not aborted)
        // When aborted, we keep the optimistic local state to avoid race conditions
        // with the backend's async save operation
        if (!wasAbortedRef.current) {
          [
            getThreadsControllerFindOneQueryKey(params.threadId),
            getThreadsControllerFindAllQueryKey(),
          ].forEach((queryKey) => {
            void queryClient.invalidateQueries({
              queryKey,
            });
          });
        }

        // Reset the abort flag for next request
        wasAbortedRef.current = false;
      }
    },
    [params, t, queryClient],
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

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isLoadingRef.current = false;
    wasAbortedRef.current = true;

    // Don't invalidate queries immediately on abort
    // The backend will save the message asynchronously, and we'll get the update
    // through normal query invalidation in the finally block
    // This prevents race conditions where we refetch before backend finishes saving
  }, []);

  return {
    sendTextMessage,
    sendToolResult,
    abort,
    isLoading: isLoadingRef.current,
  };
}
