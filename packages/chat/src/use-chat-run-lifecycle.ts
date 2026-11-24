import { useCallback, useLayoutEffect, useRef } from 'react';
import type {
  RunErrorResponseDto,
  RunMasksResponseDto,
  RunMessageResponseDto,
  RunSessionResponseDto,
  RunThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client/schemas';
import type { RunEndpoints, RunMessagePayload } from './run-endpoints';
import type { RunExecutionRequest, StartedRunRequest } from './run-execution';
import type { ChatRunLifecycle, RunRequestObserver } from './run-lifecycle';
import { useRuntimeSession } from './use-runtime-session';
import type { RunViewEvent } from './run-event-routing';

export interface PendingImage {
  file: File;
  altText?: string;
}

export interface SendMessageInput {
  text: string;
  images?: PendingImage[];
  skillId?: string;
  startedRequest?: StartedRunRequest;
  voiceInput?: boolean;
}

export interface ChatRunParams {
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

interface ChatRunOptions {
  readonly transport?: RunEndpoints;
  readonly observeRequest?: (
    request: RunExecutionRequest,
    voiceInput: boolean,
    onError: ChatRunParams['onError'],
  ) => RunRequestObserver;
}

function dispatchViewEvent(params: ChatRunParams, event: RunViewEvent): void {
  switch (event.type) {
    case 'message':
      params.onMessageEvent?.(event);
      break;
    case 'session':
      params.onSessionEvent?.(event);
      break;
    case 'thread':
      params.onThreadEvent?.(event);
      break;
    case 'masks':
      params.onMasksEvent?.(event);
      break;
  }
}

function observeView(
  params: ChatRunParams,
  observer: RunRequestObserver = {},
): RunRequestObserver {
  return {
    ...observer,
    onMessageReceived: params.onMessageReceived,
    onError: observer.onError ?? params.onError,
    onEvent(event) {
      observer.onEvent?.(event);
      if (event.type === 'error') params.onErrorEvent?.(event);
    },
    onComplete(outcome) {
      if (outcome.reattachFailed) params.onComplete?.(true, 'reattach-failed');
      else params.onComplete?.(outcome.failed);
      return observer.onComplete?.(outcome);
    },
  };
}

export function useChatRunLifecycle(
  lifecycle: ChatRunLifecycle,
  params: ChatRunParams,
  { transport, observeRequest }: ChatRunOptions = {},
) {
  const { threadId } = params;
  const currentParams = useRunView(lifecycle, params);

  const send = useCallback(
    (request: RunExecutionRequest, voiceInput = false) => {
      const params = currentParams.current;
      const observer = observeRequest?.(request, voiceInput, params.onError);
      return lifecycle.run(request, observeView(params, observer), transport);
    },
    [lifecycle, observeRequest, transport],
  );

  const sendTextMessage = useTextMessageSender(threadId, send);

  const sendToolResult = useCallback(
    (toolResult: NonNullable<RunMessagePayload['toolResult']>) =>
      send({ threadId, toolResult, streaming: true }),
    [send, threadId],
  );

  const sendToolCallDecisions = useCallback(
    (decisions: ToolCallDecisionDto[]) =>
      send({ threadId, decisions, streaming: true }),
    [send, threadId],
  );

  const attach = useCallback(
    () => send({ threadId, isAttach: true }),
    [send, threadId],
  );

  const abort = useCallback(
    () => lifecycle.stopThreadRun(threadId, transport),
    [lifecycle, threadId, transport],
  );

  return {
    sendTextMessage,
    sendToolResult,
    sendToolCallDecisions,
    attach,
    abort,
  };
}

function useRunView(lifecycle: ChatRunLifecycle, params: ChatRunParams) {
  const { threadId } = params;
  const currentParams = useRef(params);
  const session = useRuntimeSession(lifecycle);
  useLayoutEffect(() => {
    currentParams.current = params;
  }, [params]);

  useLayoutEffect(
    () =>
      lifecycle.subscribe(threadId, (event) =>
        dispatchViewEvent(currentParams.current, event),
      ),
    [lifecycle, threadId, session],
  );

  return currentParams;
}

function useTextMessageSender(
  threadId: string,
  send: (request: RunExecutionRequest, voiceInput?: boolean) => Promise<void>,
) {
  return useCallback(
    ({ text, images, skillId, startedRequest, voiceInput }: SendMessageInput) =>
      send(
        {
          threadId,
          text,
          images: images?.length ? images.map(({ file }) => file) : undefined,
          imageAltTexts: images?.length
            ? images.map(({ altText }) => altText ?? '')
            : undefined,
          skillId: skillId || undefined,
          startedRequest,
          streaming: true,
        },
        voiceInput,
      ),
    [send, threadId],
  );
}
