import {
  useCallback,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import type {
  ChatActiveRunSnapshot,
  ChatThreadSnapshot,
  ConversationRuntime,
  ConversationRuntimeAdapters,
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
import { removePendingToolCalls } from './remove-pending-tool-calls';

const NO_ACTIVE_RUN = { dataUpdatedAt: 0, isFetching: false };
type RunEnded = ReturnType<typeof useClientToolLifecycle>['runEnded'];

interface SelectedToolView {
  readonly threadId: string;
  readonly contextKey: unknown;
  readonly runEnded: RunEnded;
}

function useRunObserver<Context, Outcome>(
  props: ConversationRuntime<Context, Outcome>,
  lifecycle: ChatRunLifecycle,
) {
  const { thread, adapters, clientTools } = props;
  const selected = useRef<SelectedToolView | null>(null);
  const onAccepted = useRef<(() => void) | undefined>(undefined);

  function observeRequest(
    request: RunExecutionRequest,
    voiceInput: boolean,
    onError?: (error: Error) => void,
  ): RunRequestObserver {
    const accepted = onAccepted.current;
    onAccepted.current = undefined;
    return observeConversationRun(lifecycle, request, {
      adapters,
      clientTools,
      selected,
      accepted,
      observer: adapters?.observeRun?.(request, voiceInput, onError),
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
      onErrorEvent: adapters?.onRunError,
      onError: adapters?.onError,
    },
    { transport: props.transport, observeRequest },
  );

  return { isStreaming, state, run, selected, onAccepted };
}

interface ConversationRunOptions<Context, Outcome> {
  readonly adapters?: ConversationRuntimeAdapters;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly selected: { current: SelectedToolView | null };
  readonly accepted?: () => void;
  readonly observer?: RunRequestObserver;
}

function observeConversationRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  request: RunExecutionRequest,
  options: ConversationRunOptions<Context, Outcome>,
): RunRequestObserver {
  const { threadId, isAttach } = request;
  const { adapters, clientTools, selected, accepted, observer } = options;
  const messages = new Map<string, ClientToolMessage>();
  let receivedUserMessage = false;
  const accept = acceptOnce(accepted);
  return {
    onAbort: observer?.onAbort,
    onUnauthorized() {
      adapters?.onUnauthorized?.();
      observer?.onUnauthorized?.();
    },
    onError(error) {
      if (observer?.onError) observer.onError(error);
      else adapters?.onError?.(error);
    },
    onEvent(event) {
      observer?.onEvent?.(event);
      if (event.type === 'message') {
        if (clientTools) messages.set(event.message.id, event.message);
        if (event.message.role === 'user') receivedUserMessage = true;
      }
    },
    onMessageReceived() {
      if (receivedUserMessage) {
        accept();
        adapters?.onMessageReceived?.(threadId);
      }
      observer?.onMessageReceived?.();
    },
    async onComplete(outcome, session) {
      if (!outcome.failed) accept();
      settleConversationTools({
        lifecycle,
        threadId,
        clientTools,
        selected: selected.current,
        outcome,
        followedMessageCount: isAttach ? messages.size : undefined,
        messages: [...messages.values()],
      });
      adapters?.onRunSettled?.(threadId, outcome);
      await observer?.onComplete?.(outcome, session);
    },
  };
}

function acceptOnce(callback?: () => void) {
  let pending = callback;
  return () => {
    pending?.();
    pending = undefined;
  };
}

function settleConversationTools<Context, Outcome>({
  lifecycle,
  threadId,
  clientTools,
  selected,
  outcome,
  followedMessageCount,
  messages,
}: Readonly<{
  lifecycle: ChatRunLifecycle;
  threadId: string;
  clientTools?: ClientToolDispatch<Context, Outcome>;
  selected: SelectedToolView | null;
  outcome: RunOutcome;
  followedMessageCount?: number;
  messages: readonly ClientToolMessage[];
}>) {
  if (matchesToolView(selected, threadId, clientTools?.contextKey)) {
    settleSelectedTools(selected, outcome, followedMessageCount);
  } else if (clientTools && !outcome.failed) {
    deferToolResults(lifecycle, threadId, clientTools, messages);
  }
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
  props: ConversationRuntime<Context, Outcome>,
) {
  const { thread, activeRun, clientTools, transport, adapters } = props;
  const observed = useRunObserver(props, lifecycle);
  const { isStreaming, state, run, selected, onAccepted } = observed;
  const status = useConversationRunStatus(
    lifecycle,
    thread.id,
    isStreaming,
    run.attach,
    transport.follow ? (activeRun ?? NO_ACTIVE_RUN) : NO_ACTIVE_RUN,
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
  const controls = useConversationControls({
    lifecycle,
    thread,
    state,
    run,
    tools,
    status,
    onAccepted,
    adapters,
  });
  return { ...state, ...status, ...run, isStreaming, ...controls };
}

interface ConversationControlsOptions {
  readonly lifecycle: ChatRunLifecycle;
  readonly thread: ChatThreadSnapshot;
  readonly state: ReturnType<typeof useChatThreadState>;
  readonly run: ReturnType<typeof useChatRunLifecycle>;
  readonly tools: ReturnType<typeof useClientToolLifecycle>;
  readonly status: ReturnType<typeof useConversationRunStatus>;
  readonly onAccepted: { current: (() => void) | undefined };
  readonly adapters?: ConversationRuntimeAdapters;
}

function useConversationControls(options: ConversationControlsOptions) {
  const { lifecycle, thread, state, run, tools, status, onAccepted, adapters } =
    options;
  useSelectedThread(
    lifecycle,
    thread,
    state,
    run.sendTextMessage,
    tools.beginRun,
    adapters?.onThreadState,
    adapters?.onStartedRun,
  );
  const resumeStartedRun = useCallback(
    () =>
      takeStartedRun(
        lifecycle,
        thread,
        run.sendTextMessage,
        tools.beginRun,
        adapters?.onStartedRun,
      ),
    [
      lifecycle,
      thread,
      run.sendTextMessage,
      tools.beginRun,
      adapters?.onStartedRun,
    ],
  );
  function send(input: SendMessageInput, accepted: () => void) {
    if (status.isCheckingForRun || lifecycle.isThreadRunActive(thread.id))
      return Promise.resolve();
    onAccepted.current = accepted;
    tools.beginRun();
    return run.sendTextMessage(input);
  }
  function stop() {
    run.abort();
    state.setMessages(removePendingToolCalls);
  }
  return { send, stop, resumeStartedRun };
}

function useConversationRunStatus(
  lifecycle: ChatRunLifecycle,
  threadId: string,
  isStreaming: boolean,
  attach: ReturnType<typeof useChatRunLifecycle>['attach'],
  activeRun: ChatActiveRunSnapshot,
) {
  return useThreadRunReattach(
    lifecycle,
    { threadId, isStreaming, attach },
    activeRun,
  );
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
  thread: ChatThreadSnapshot,
  state: ReturnType<typeof useChatThreadState>,
  sendTextMessage: ReturnType<typeof useChatRunLifecycle>['sendTextMessage'],
  beginRun: ReturnType<typeof useClientToolLifecycle>['beginRun'],
  onThreadState?: ConversationRuntimeAdapters['onThreadState'],
  onStartedRun?: ConversationRuntimeAdapters['onStartedRun'],
) {
  const { id } = thread;
  const { messages, piiMasks, threadTitle } = state;
  useLayoutEffect(() => {
    onThreadState?.({ id, messages, piiMasks, title: threadTitle });
  }, [id, messages, piiMasks, threadTitle, onThreadState]);
  useLayoutEffect(() => {
    takeStartedRun(lifecycle, thread, sendTextMessage, beginRun, onStartedRun);
  }, [lifecycle, thread, beginRun, sendTextMessage, onStartedRun]);
}

function takeStartedRun(
  lifecycle: ChatRunLifecycle,
  thread: ChatThreadSnapshot,
  sendTextMessage: ReturnType<typeof useChatRunLifecycle>['sendTextMessage'],
  beginRun: ReturnType<typeof useClientToolLifecycle>['beginRun'],
  onStartedRun?: ConversationRuntimeAdapters['onStartedRun'],
): boolean {
  const started = lifecycle.takeStartedThreadRun(thread.id);
  if (!started) return false;
  onStartedRun?.(
    thread.id,
    started,
    thread.messages.length > started.messageCountBeforeSend,
  );
  beginRun({ takesOverStartedRun: true });
  void sendTextMessage({
    text: started.text,
    voiceInput: started.voiceInput,
    startedRequest: started.request,
  });
  return true;
}
