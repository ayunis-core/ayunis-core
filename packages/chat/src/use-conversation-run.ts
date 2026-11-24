import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type {
  ChatConversationAdapters,
  ChatConversationProps,
} from './chat-conversation-config';
import type { ChatRunLifecycle, RunRequestObserver } from './run-lifecycle';
import {
  useChatRunLifecycle,
  type SendMessageInput,
} from './use-chat-run-lifecycle';
import { useChatThreadState } from './use-chat-thread-state';
import { useClientToolLifecycle } from './use-client-tool-lifecycle';
import { useThreadRunReattach } from './use-thread-run-reattach';

const NO_ACTIVE_RUN = { dataUpdatedAt: 0, isFetching: false };
type RunEnded = ReturnType<typeof useClientToolLifecycle>['runEnded'];

function useRunObserver<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
  lifecycle: ChatRunLifecycle,
) {
  const { thread, adapters } = props;
  const selected = useRef({
    threadId: thread.id,
    runEnded: undefined as RunEnded | undefined,
  });
  const onAccepted = useRef<(() => void) | undefined>(undefined);

  function observeRequest(): RunRequestObserver {
    const threadId = thread.id;
    const accepted = onAccepted.current;
    onAccepted.current = undefined;
    return observeConversationRun(threadId, adapters, selected, accepted);
  }

  const isStreaming = useSyncExternalStore(
    lifecycle.subscribeToActiveThreadRuns,
    lifecycle.getActiveThreadRunIds,
    lifecycle.getActiveThreadRunIds,
  ).has(thread.id);
  const state = useChatThreadState(thread, isStreaming);
  const run = useChatRunLifecycle(
    lifecycle,
    {
      threadId: thread.id,
      onMessageEvent: ({ message }) => state.handleMessage(message),
      onThreadEvent: ({ title }) => state.setThreadTitle(title),
      onMasksEvent: state.handleMasks,
    },
    { transport: props.config.transport, observeRequest },
  );

  return { isStreaming, state, run, selected, onAccepted };
}

function observeConversationRun(
  threadId: string,
  adapters: ChatConversationAdapters | undefined,
  selected: { current: { threadId: string; runEnded?: RunEnded } },
  accepted: (() => void) | undefined,
): RunRequestObserver {
  let onAccepted = accepted;
  function accept() {
    onAccepted?.();
    onAccepted = undefined;
  }
  return {
    onUnauthorized: adapters?.onUnauthorized,
    onError: adapters?.onError,
    onEvent(event) {
      if (event.type === 'message' && event.message.role === 'user') accept();
    },
    onComplete(outcome) {
      if (!outcome.failed) accept();
      if (selected.current.threadId === threadId)
        selected.current.runEnded?.(
          outcome.failed,
          outcome.reattachFailed ? 'reattach-failed' : undefined,
        );
      adapters?.onRunSettled?.(threadId, outcome);
    },
  };
}

export function useConversationRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  props: ChatConversationProps<Context, Outcome>,
) {
  const { thread, activeRun, clientTools, config } = props;
  const { isStreaming, state, run, selected, onAccepted } = useRunObserver(
    props,
    lifecycle,
  );
  const status = useThreadRunReattach(
    lifecycle,
    {
      threadId: thread.id,
      isStreaming,
      attach: run.attach,
    },
    config.transport.follow ? (activeRun ?? NO_ACTIVE_RUN) : NO_ACTIVE_RUN,
  );
  const tools = useClientToolLifecycle(lifecycle, {
    threadId: thread.id,
    messages: state.messages,
    isStreaming,
    isCheckingForRun: status.isCheckingForRun,
    dispatch: clientTools,
    sendToolResult: run.sendToolResult,
  });

  useLayoutEffect(() => {
    selected.current = { threadId: thread.id, runEnded: tools.runEnded };
  }, [selected, thread.id, tools.runEnded]);

  function send(input: SendMessageInput, accepted: () => void) {
    if (status.isCheckingForRun || lifecycle.isThreadRunActive(thread.id))
      return;
    onAccepted.current = accepted;
    tools.beginRun();
    void run.sendTextMessage(input);
  }

  return { ...state, ...status, ...run, isStreaming, send };
}
