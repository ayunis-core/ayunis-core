import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type {
  ChatConversationAdapters,
  ChatConversationProps,
} from './chat-conversation-config';
import type { ChatRunLifecycle, RunRequestObserver } from './run-lifecycle';
import {
  pendingClientToolResults,
  type ClientToolDispatch,
} from './client-tool-dispatch';
import type { ClientToolMessage } from './client-tool-messages';
import type { RunExecutionRequest, RunOutcome } from './run-execution';
import {
  useChatRunLifecycle,
  type SendMessageInput,
} from './use-chat-run-lifecycle';
import { useChatThreadState } from './use-chat-thread-state';
import { useClientToolLifecycle } from './use-client-tool-lifecycle';
import { useThreadRunReattach } from './use-thread-run-reattach';

const NO_ACTIVE_RUN = { dataUpdatedAt: 0, isFetching: false };
type RunEnded = ReturnType<typeof useClientToolLifecycle>['runEnded'];

interface SelectedToolView {
  readonly threadId: string;
  readonly contextKey: unknown;
  readonly runEnded: RunEnded;
}

function useRunObserver<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
  lifecycle: ChatRunLifecycle,
) {
  const { thread, adapters, clientTools } = props;
  const selected = useRef<SelectedToolView | null>(null);
  const onAccepted = useRef<(() => void) | undefined>(undefined);

  function observeRequest(request: RunExecutionRequest): RunRequestObserver {
    const accepted = onAccepted.current;
    onAccepted.current = undefined;
    return observeConversationRun(lifecycle, request, {
      adapters,
      clientTools,
      selected,
      accepted,
    });
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

interface ConversationRunOptions<Context, Outcome> {
  readonly adapters?: ChatConversationAdapters;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly selected: { current: SelectedToolView | null };
  readonly accepted?: () => void;
}

function observeConversationRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  { threadId, isAttach }: RunExecutionRequest,
  {
    adapters,
    clientTools,
    selected,
    accepted,
  }: ConversationRunOptions<Context, Outcome>,
): RunRequestObserver {
  const messages = new Map<string, ClientToolMessage>();
  let onAccepted = accepted;
  let receivedUserMessage = false;
  function accept() {
    onAccepted?.();
    onAccepted = undefined;
  }
  return {
    onUnauthorized: adapters?.onUnauthorized,
    onError: adapters?.onError,
    onEvent(event) {
      if (event.type !== 'message') return;
      if (clientTools) messages.set(event.message.id, event.message);
      if (event.message.role === 'user') receivedUserMessage = true;
    },
    onMessageReceived() {
      if (receivedUserMessage) accept();
    },
    onComplete(outcome) {
      if (!outcome.failed) accept();
      const view = selected.current;
      if (matchesToolView(view, threadId, clientTools?.contextKey)) {
        settleSelectedTools(
          view,
          outcome,
          isAttach ? messages.size : undefined,
        );
      } else if (clientTools && !outcome.failed) {
        deferToolResults(lifecycle, threadId, clientTools, [
          ...messages.values(),
        ]);
      }
      adapters?.onRunSettled?.(threadId, outcome);
    },
  };
}

function matchesToolView(
  view: SelectedToolView | null,
  threadId: string,
  contextKey: unknown,
): view is SelectedToolView {
  return view?.threadId === threadId && Object.is(view.contextKey, contextKey);
}

function settleSelectedTools(
  view: SelectedToolView,
  outcome: RunOutcome,
  followedMessageCount: number | undefined,
) {
  // Following a stale active-run listing can return 204 with no turn to settle.
  if (followedMessageCount === 0 && !outcome.failed) return;
  const reason = followedMessageCount === undefined ? undefined : 'followed';
  view.runEnded(
    outcome.failed,
    outcome.reattachFailed ? 'reattach-failed' : reason,
  );
}

function deferToolResults<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  threadId: string,
  dispatch: ClientToolDispatch<Context, Outcome>,
  messages: readonly ClientToolMessage[],
) {
  const pending = pendingClientToolResults(messages, dispatch);
  if (pending.length) {
    lifecycle.deferredClientTools.set(threadId, {
      contextKey: dispatch.contextKey,
      callIds: new Set(pending.map(({ id }) => id)),
    });
  }
}

export function useConversationRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  props: ChatConversationProps<Context, Outcome>,
) {
  const { thread, activeRun, clientTools, config, adapters } = props;
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

  useSelectedToolView(
    selected,
    thread.id,
    clientTools?.contextKey,
    tools.runEnded,
  );

  useSelectedThread(
    lifecycle,
    thread,
    state,
    run.sendTextMessage,
    tools.beginRun,
    adapters?.onThreadState,
  );

  function send(input: SendMessageInput, accepted: () => void) {
    if (status.isCheckingForRun || lifecycle.isThreadRunActive(thread.id))
      return;
    onAccepted.current = accepted;
    tools.beginRun();
    void run.sendTextMessage(input);
  }

  return { ...state, ...status, ...run, isStreaming, send };
}

function useSelectedToolView(
  selected: { current: SelectedToolView | null },
  threadId: string,
  contextKey: unknown,
  runEnded: RunEnded,
) {
  useLayoutEffect(() => {
    selected.current = { threadId, contextKey, runEnded };
    return () => {
      selected.current = null;
    };
  }, [selected, threadId, contextKey, runEnded]);
}

function useSelectedThread(
  lifecycle: ChatRunLifecycle,
  thread: ChatConversationProps['thread'],
  state: ReturnType<typeof useChatThreadState>,
  sendTextMessage: ReturnType<typeof useChatRunLifecycle>['sendTextMessage'],
  beginRun: ReturnType<typeof useClientToolLifecycle>['beginRun'],
  onThreadState?: ChatConversationAdapters['onThreadState'],
) {
  const { id } = thread;
  const { messages, piiMasks, threadTitle } = state;
  useLayoutEffect(() => {
    onThreadState?.({ id, messages, piiMasks, title: threadTitle });
  }, [id, messages, piiMasks, threadTitle, onThreadState]);
  useLayoutEffect(() => {
    const started = lifecycle.takeStartedThreadRun(id);
    if (!started) return;
    beginRun({ takesOverStartedRun: true });
    void sendTextMessage({
      text: started.text,
      voiceInput: started.voiceInput,
      startedRequest: started.request,
    });
  }, [id, lifecycle, beginRun, sendTextMessage]);
}
