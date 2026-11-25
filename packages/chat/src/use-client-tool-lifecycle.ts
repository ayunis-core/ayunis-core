import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  answeredToolCallIds,
  hasPendingToolApproval,
  latestToolMessages,
  type ClientToolMessage,
} from './client-tool-messages';
import {
  executeToolBatch,
  expectsResult,
  registeredCalls,
  type ClientToolDispatch,
  type ClientToolResult,
} from './client-tool-dispatch';
import type { ChatRunLifecycle } from './run-lifecycle';
import type { ClientToolCall } from './client-tools';

interface ClientToolLifecycleOptions<Context, Outcome> {
  readonly threadId: string;
  readonly messages: readonly ClientToolMessage[];
  readonly isStreaming: boolean;
  readonly isCheckingForRun: boolean;
  readonly dispatch?: ClientToolDispatch<Context, Outcome>;
  readonly sendToolResult: (result: ClientToolResult) => Promise<void>;
}

interface Scope {
  readonly threadId: string;
  readonly session: AbortSignal;
  readonly handled: Set<string>;
  mounted: boolean;
  batch?: AbortController;
}

interface CompletedRun {
  readonly scope: Scope;
  readonly failed: boolean;
  readonly reopened?: boolean;
}

function scopeIsCurrent(scope: Scope) {
  return scope.mounted && !scope.session.aborted;
}

function canFinishBatch(scope: Scope, signal: AbortSignal): boolean {
  return scopeIsCurrent(scope) && !signal.aborted;
}

function initializeScope<Context, Outcome>(
  scope: Scope,
  { dispatch, messages }: ClientToolLifecycleOptions<Context, Outcome>,
  reopenedThread: boolean,
): boolean {
  if (!dispatch) return false;
  const resume = dispatch.resumeOnOpen?.() === true && reopenedThread;
  const awaiting = resume
    ? new Set(waitingReads(messages, dispatch).map(({ id }) => id))
    : undefined;
  for (const { id } of registeredCalls(messages, dispatch)) {
    if (!awaiting?.has(id)) scope.handled.add(id);
  }
  return (awaiting?.size ?? 0) > 0;
}

function waitingReads<Context, Outcome>(
  messages: readonly ClientToolMessage[],
  dispatch: ClientToolDispatch<Context, Outcome>,
) {
  if (hasPendingToolApproval(messages)) return [];
  const answered = answeredToolCallIds(messages);
  return registeredCalls(latestToolMessages(messages), dispatch).filter(
    (call) => expectsResult(call, dispatch) && !answered.has(call.id),
  );
}

function dispatchCompletedRun<Context, Outcome>(
  completion: CompletedRun,
  {
    dispatch,
    messages,
    sendToolResult,
  }: ClientToolLifecycleOptions<Context, Outcome>,
): Promise<void> | undefined {
  const { scope } = completion;
  if (!dispatch || dispatch.canDispatch?.() === false) return;
  const calls = takeUnhandledCalls(completion, messages, dispatch);
  if (completion.failed || calls.length === 0) return;
  const batch = new AbortController();
  scope.batch?.abort();
  scope.batch = batch;
  return runBatch(scope, batch.signal, { calls, dispatch, sendToolResult });
}

async function runBatch<Context, Outcome>(
  scope: Scope,
  signal: AbortSignal,
  {
    calls,
    dispatch,
    sendToolResult,
  }: {
    calls: readonly ClientToolCall[];
    dispatch: ClientToolDispatch<Context, Outcome>;
    sendToolResult: (result: ClientToolResult) => Promise<void>;
  },
): Promise<void> {
  try {
    dispatch.onCalls?.(calls);
    const result = await executeToolBatch(calls, dispatch, signal);
    if (result && canFinishBatch(scope, signal)) {
      await sendToolResult(result);
    }
  } catch (error) {
    if (canFinishBatch(scope, signal)) {
      console.error('Unable to finish client tool calls', error);
    }
  }
}

function takeUnhandledCalls<Context, Outcome>(
  { scope, reopened }: CompletedRun,
  messages: readonly ClientToolMessage[],
  dispatch: ClientToolDispatch<Context, Outcome>,
) {
  const candidates = reopened
    ? waitingReads(messages, dispatch)
    : registeredCalls(messages, dispatch);
  const calls = candidates.filter(({ id }) => !scope.handled.has(id));
  for (const { id } of calls) scope.handled.add(id);
  const answered = answeredToolCallIds(messages);
  return calls.filter(
    (call) => !expectsResult(call, dispatch) || !answered.has(call.id),
  );
}

function canResumeInScope(previous: Scope | null, scope: Scope): boolean {
  return (
    previous === null ||
    (previous.session === scope.session && previous.threadId !== scope.threadId)
  );
}

function useRuntimeSession(lifecycle: ChatRunLifecycle): AbortSignal {
  const signal = lifecycle.getSessionSignal();
  const subscribe = useCallback(
    (notify: () => void) => {
      signal.addEventListener('abort', notify);
      return () => signal.removeEventListener('abort', notify);
    },
    [signal],
  );
  return useSyncExternalStore(
    subscribe,
    lifecycle.getSessionSignal,
    lifecycle.getSessionSignal,
  );
}

function useToolScope<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
  reopen: (scope: Scope) => void,
) {
  const { threadId, dispatch } = options;
  const enabled = dispatch !== undefined;
  const contextKey = dispatch?.contextKey;
  const session = useRuntimeSession(lifecycle);
  const scope = useMemo<Scope>(
    () => ({
      threadId,
      session,
      handled: new Set(),
      mounted: false,
    }),
    [session, threadId, contextKey, enabled],
  );
  const latest = useRef(options);
  const opened = useRef<Scope>(null);
  useLayoutEffect(() => {
    latest.current = options;
  }, [options]);

  useLayoutEffect(() => {
    if (!enabled || session.aborted) return;
    scope.mounted = true;
    if (opened.current !== scope) {
      const resume = canResumeInScope(opened.current, scope);
      opened.current = scope;
      if (initializeScope(scope, latest.current, resume)) reopen(scope);
    }
    const abort = () => scope.batch?.abort();
    session.addEventListener('abort', abort);
    return () => {
      scope.mounted = false;
      session.removeEventListener('abort', abort);
      abort();
    };
  }, [enabled, reopen, scope, session]);

  return { scope, latest };
}

/**
 * Coordinates client tools for a mounted chat view. Call beginRun before a
 * user send or first-message handoff, and runEnded from the run completion callback.
 */
export function useClientToolLifecycle<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
) {
  const [completion, setCompletion] = useState<CompletedRun | null>(null);
  const reopen = useCallback(
    (scope: Scope) => setCompletion({ scope, failed: false, reopened: true }),
    [],
  );
  const { scope, latest } = useToolScope(lifecycle, options, reopen);

  const beginRun = useCallback(
    ({ takesOverStartedRun = false } = {}) => {
      if (!scopeIsCurrent(scope)) return;
      const { dispatch, messages } = latest.current;
      if (!dispatch) return;
      scope.batch?.abort();
      setCompletion(null);
      for (const { id } of registeredCalls(messages, dispatch))
        scope.handled.add(id);
      if (takesOverStartedRun) {
        for (const { id } of registeredCalls(
          latestToolMessages(messages),
          dispatch,
        ))
          scope.handled.delete(id);
      }
      dispatch.onBeginRun?.(takesOverStartedRun);
    },
    [latest, scope],
  );

  const runEnded = useCallback(
    (failed: boolean, reason?: 'reattach-failed') => {
      if (!scopeIsCurrent(scope)) return;
      setCompletion((current) =>
        reason === 'reattach-failed' &&
        current?.scope === scope &&
        current.reopened
          ? current
          : { scope, failed },
      );
    },
    [scope],
  );

  useDispatchCompletedRun(lifecycle, options, { scope, latest, completion });
  return { beginRun, runEnded };
}

function useDispatchCompletedRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
  {
    scope,
    latest,
    completion,
  }: {
    scope: Scope;
    latest: { current: ClientToolLifecycleOptions<Context, Outcome> };
    completion: CompletedRun | null;
  },
) {
  const settled = useRef<CompletedRun>(null);
  const { threadId, messages, isStreaming, isCheckingForRun } = options;
  const busy = isStreaming || (completion?.reopened && isCheckingForRun);
  useEffect(() => {
    if (
      !scopeIsCurrent(scope) ||
      completion?.scope !== scope ||
      settled.current === completion
    )
      return;
    if (busy || lifecycle.isThreadRunActive(threadId)) return;
    if (!completion.failed && hasPendingToolApproval(messages)) return;
    settled.current = completion;
    void dispatchCompletedRun(completion, latest.current);
  }, [busy, completion, latest, lifecycle, messages, scope, threadId]);
}
