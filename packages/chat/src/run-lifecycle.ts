import type { RunMessageResponseDto } from '@ayunis/api-client/schemas';
import { createActiveThreadRuns } from './active-thread-run';
import { createDeferredClientTools } from './deferred-client-tools';
import { createStoppedThreadRuns } from './stopped-thread-runs';
import { createStartedThreadRuns } from './started-thread-run';
import {
  createDeferredThreadRuns,
  type WaitingMessageStorage,
} from './deferred-thread-runs';
import { createThreadSubmissions } from './thread-submissions';
import { createFrameCoalescer } from './frame-coalescer';
import { createRunEventRouting } from './run-event-routing';
import { stopRun } from './run-cancellation';
import type { RunEndpoints } from './run-endpoints';
import {
  executeRun,
  type RunExecutionRequest,
  type RunOutcome,
} from './run-execution';
import type { RunEvent } from './run-stream';

export interface RunRequestObserver {
  readonly onEvent?: (event: RunEvent) => void;
  readonly onMessageReceived?: () => void;
  readonly onAbort?: () => void;
  readonly onUnauthorized?: () => void;
  readonly onError?: (error: Error) => void;
  readonly onComplete?: (
    outcome: RunOutcome,
    session: AbortSignal,
  ) => Promise<void> | void;
}

export type ChatRunLifecycle = ReturnType<typeof createChatRunLifecycle>;

export interface ChatRunLifecycleOptions {
  readonly waitingMessages?: WaitingMessageStorage;
}

/** Messages on their way into a chat: started, waiting for files, or sent. */
function createPendingMessages(
  endpoints: RunEndpoints,
  activity: ReturnType<typeof createActiveThreadRuns>,
  options: ChatRunLifecycleOptions,
) {
  const handoffs = createStartedThreadRuns(activity.registerActiveThreadRun);
  const submissions = createThreadSubmissions();
  const deferred = createDeferredThreadRuns(
    (run) => handoffs.startRun(run, endpoints.send),
    options.waitingMessages,
  );
  return {
    handoffs,
    submissions,
    deferred,
    startThreadRun: (request: Parameters<typeof handoffs.startRun>[0]) => {
      handoffs.startRun(request, endpoints.send);
    },
    takeStartedThreadRun: handoffs.takeStartedThreadRun,
    clear() {
      handoffs.clearStartedThreadRuns();
      deferred.clearDeferredThreadRuns();
      submissions.clearSubmissions();
    },
  };
}

/** One lifecycle per surface session. Open or close views without ending their runs. */
export function createChatRunLifecycle(
  endpoints: RunEndpoints,
  options: ChatRunLifecycleOptions = {},
) {
  const activity = createActiveThreadRuns();
  const stopped = createStoppedThreadRuns();
  const messages = createPendingMessages(endpoints, activity, options);
  const events = createRunEventRouting();
  const executor = createRunExecutor(activity, events);
  const deferredClientTools = createDeferredClientTools();
  let sessionResetAt = 0;
  let session = new AbortController();

  const stopThreadRun = (threadId: string, transport = endpoints): void =>
    stopRun(threadId, transport.cancel, {
      ...stopped,
      abortActiveThreadRun: activity.abortActiveThreadRun,
    });

  return {
    ...activity,
    ...stopped,
    ...messages.submissions,
    ...messages.deferred,
    deferredClientTools,
    subscribe: events.subscribe,
    run: (
      request: RunExecutionRequest,
      observer: RunRequestObserver = {},
      transport = endpoints,
    ) => executor.run(request, observer, transport, session.signal),
    stopThreadRun,
    startThreadRun: messages.startThreadRun,
    takeStartedThreadRun: messages.takeStartedThreadRun,
    cancelStartedThreadRun: (threadId: string) =>
      messages.handoffs.cancelStartedRun(threadId, stopThreadRun),
    getSessionResetAt: () => sessionResetAt,
    getSessionSignal: () => session.signal,
    reset() {
      sessionResetAt = Date.now();
      const previousSession = session;
      session = new AbortController();
      deferredClientTools.clear();
      executor.reset();
      previousSession.abort();
      events.clear();
      messages.clear();
      stopped.clearStoppedThreadRuns();
      activity.abortAllThreadRuns();
    },
  };
}

function createRunExecutor(
  activity: ReturnType<typeof createActiveThreadRuns>,
  events: ReturnType<typeof createRunEventRouting>,
) {
  const requests = new Map<string, AbortController>();

  function run(
    request: RunExecutionRequest,
    observer: RunRequestObserver,
    transport: RunEndpoints,
    session: AbortSignal,
  ): Promise<void> {
    const { threadId } = request;
    const controller =
      request.startedRequest?.controller ?? new AbortController();
    const isCurrent = () => requests.get(threadId) === controller;
    const canReceiveEvents = () => isCurrent() && !controller.signal.aborted;
    const handlers = routeRequest({
      threadId,
      events,
      observer,
      session,
      isCurrent,
      canReceiveEvents,
    });
    activity.registerActiveThreadRun(threadId, controller);
    requests.set(threadId, controller);
    return executeRun(
      transport,
      request,
      {
        ...handlers,
        onCleanup: () => {
          try {
            handlers.onCleanup();
          } finally {
            activity.unregisterActiveThreadRun(threadId, controller);
          }
        },
      },
      controller,
    ).finally(() => {
      if (isCurrent()) requests.delete(threadId);
    });
  }

  return { run, reset: () => requests.clear() };
}

interface RunRouting {
  readonly threadId: string;
  readonly events: ReturnType<typeof createRunEventRouting>;
  readonly observer: RunRequestObserver;
  readonly session: AbortSignal;
  readonly isCurrent: () => boolean;
  readonly canReceiveEvents: () => boolean;
}

function abortRequest(flush: () => void, notify?: () => void) {
  flush();
  notify?.();
}

function routeRequest({
  threadId,
  events,
  observer,
  session,
  isCurrent,
  canReceiveEvents,
}: RunRouting) {
  // Every message event is a full snapshot. Keep the last one per frame and
  // flush before non-message events and run completion.
  const messages = createFrameCoalescer<RunMessageResponseDto>(
    (event) => event.message.id,
    (batch) => {
      if (!isCurrent()) return;
      observer.onMessageReceived?.();
      for (const event of batch) {
        if (!isCurrent()) break;
        events.publish(threadId, event);
      }
    },
  );

  return {
    onEvent(event: RunEvent): void {
      if (!canReceiveEvents()) return;
      if (event.type === 'message') messages.push(event);
      else {
        messages.flush();
        if (
          canReceiveEvents() &&
          event.type !== 'integration_warning' &&
          event.type !== 'error'
        ) {
          events.publish(threadId, event);
        }
      }
      if (canReceiveEvents()) observer.onEvent?.(event);
    },
    onUnauthorized: () => {
      if (canReceiveEvents()) observer.onUnauthorized?.();
    },
    onError: (error: Error) => {
      if (canReceiveEvents()) observer.onError?.(error);
    },
    onAbort: () => abortRequest(messages.flush, observer.onAbort),
    onCleanup: () => {
      messages.flush();
      if (isCurrent()) events.discard(threadId);
    },
    onComplete: (outcome: RunOutcome) =>
      canReceiveEvents() ? observer.onComplete?.(outcome, session) : undefined,
  };
}
