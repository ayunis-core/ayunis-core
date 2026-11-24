import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  answeredToolCallIds,
  hasPendingToolApproval,
  latestToolMessages,
  listClientToolCalls,
  type ClientToolMessage,
} from './client-tool-messages';
import {
  executeToolBatch,
  expectsResult,
  pendingClientToolResults,
  registeredCalls,
  type ClientToolDispatch,
  type ClientToolResult,
} from './client-tool-dispatch';
import { useRuntimeSession } from './use-runtime-session';
import type { ChatRunLifecycle, DeferredClientTools } from './run-lifecycle';
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
  readonly deferred?: DeferredClientTools;
}

type RunEndReason = 'reattach-failed' | 'followed';

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
  deferred: DeferredClientTools | undefined,
): CompletedRun | undefined {
  if (!dispatch) return;
  const awaiting = pendingToolsOnOpen(
    dispatch,
    messages,
    reopenedThread,
    deferred,
  );
  for (const { id } of registeredCalls(messages, dispatch)) {
    if (!awaiting?.callIds.has(id)) scope.handled.add(id);
  }
  if (awaiting?.callIds.size) {
    return {
      scope,
      failed: false,
      reopened: true,
      deferred: awaiting.deferred,
    };
  }
}

function pendingToolsOnOpen<Context, Outcome>(
  dispatch: ClientToolDispatch<Context, Outcome>,
  messages: readonly ClientToolMessage[],
  reopenedThread: boolean,
  deferred: DeferredClientTools | undefined,
) {
  const resume = dispatch.resumeOnOpen?.();
  if (resume === false) return;
  if (deferred) {
    if (Object.is(deferred.contextKey, dispatch.contextKey)) {
      return { callIds: deferred.callIds, deferred };
    }
    return;
  }
  if (reopenedThread && resume) {
    return {
      callIds: new Set(
        pendingClientToolResults(messages, dispatch).map(({ id }) => id),
      ),
      deferred: undefined,
    };
  }
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
  if (!dispatch) return;
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

function retainsReopenedCompletion(
  lifecycle: ChatRunLifecycle,
  scope: Scope,
  current: CompletedRun | null,
  reason: RunEndReason | undefined,
): boolean {
  if (current?.scope !== scope || !current.reopened) return false;
  if (reason === 'reattach-failed') return true;
  return (
    reason === 'followed' &&
    current.deferred !== undefined &&
    lifecycle.deferredClientTools.get(scope.threadId) === current.deferred
  );
}

function reconsiderFollowedCalls<Context, Outcome>(
  scope: Scope,
  { dispatch, messages }: ClientToolLifecycleOptions<Context, Outcome>,
  followed: boolean,
) {
  if (!followed || !dispatch) return;
  for (const { id } of pendingClientToolResults(messages, dispatch)) {
    scope.handled.delete(id);
  }
}

function takeUnhandledCalls<Context, Outcome>(
  { scope, reopened, deferred }: CompletedRun,
  messages: readonly ClientToolMessage[],
  dispatch: ClientToolDispatch<Context, Outcome>,
) {
  const candidates = reopened
    ? pendingClientToolResults(messages, dispatch)
    : registeredCalls(messages, dispatch);
  const calls = candidates.filter(
    ({ id }) =>
      !scope.handled.has(id) && (!deferred || deferred.callIds.has(id)),
  );
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

function useToolScope<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
  reopen: (completion: CompletedRun) => void,
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
      const completion = initializeScope(
        scope,
        latest.current,
        resume,
        lifecycle.deferredClientTools.get(threadId),
      );
      if (completion) reopen(completion);
    }
    const abort = () => scope.batch?.abort();
    session.addEventListener('abort', abort);
    return () => {
      scope.mounted = false;
      session.removeEventListener('abort', abort);
      abort();
    };
  }, [enabled, lifecycle, reopen, scope, session, threadId]);

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
  const { scope, latest } = useToolScope(lifecycle, options, setCompletion);

  const beginRun = useCallback(
    ({ takesOverStartedRun = false } = {}) => {
      if (!scopeIsCurrent(scope)) return;
      const { dispatch, messages } = latest.current;
      if (!dispatch) return;
      scope.batch?.abort();
      lifecycle.deferredClientTools.delete(scope.threadId);
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
    [latest, lifecycle, scope],
  );

  const runEnded = useCallback(
    (failed: boolean, reason?: RunEndReason) => {
      if (!scopeIsCurrent(scope)) return;
      reconsiderFollowedCalls(
        scope,
        latest.current,
        reason === 'followed' && !failed,
      );
      setCompletion((current) =>
        retainsReopenedCompletion(lifecycle, scope, current, reason)
          ? current
          : { scope, failed },
      );
    },
    [latest, lifecycle, scope],
  );

  useDispatchCompletedRun(lifecycle, options, scope, completion);
  return { beginRun, runEnded };
}

function useDispatchCompletedRun<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
  scope: Scope,
  completion: CompletedRun | null,
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
    settleCompletion(lifecycle, options, completion, settled);
  }, [busy, completion, lifecycle, messages, options, scope, threadId]);
}

function settleCompletion<Context, Outcome>(
  lifecycle: ChatRunLifecycle,
  options: ClientToolLifecycleOptions<Context, Outcome>,
  completion: CompletedRun,
  settled: { current: CompletedRun | null },
): void {
  const canDispatch = options.dispatch?.canDispatch?.() !== false;
  if (completion.reopened && !canDispatch) return;
  if (!claimDeferredTools(lifecycle, completion, options.messages)) return;
  settled.current = completion;
  if (canDispatch) void dispatchCompletedRun(completion, options);
}

function claimDeferredTools(
  lifecycle: ChatRunLifecycle,
  { scope, deferred }: CompletedRun,
  messages: readonly ClientToolMessage[],
): boolean {
  if (!deferred) return true;
  if (lifecycle.deferredClientTools.get(scope.threadId) !== deferred)
    return false;
  // The host may render a cached snapshot before the completed turn is loaded.
  if (!listClientToolCalls(messages).some(({ id }) => deferred.callIds.has(id)))
    return false;
  lifecycle.deferredClientTools.delete(scope.threadId);
  return true;
}
