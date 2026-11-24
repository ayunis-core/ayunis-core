import type { RunMessageResponseDto } from '@ayunis/api-client/schemas';
import { createActiveThreadRuns } from './active-thread-run';
import { createStoppedThreadRuns } from './stopped-thread-runs';
import { createStartedThreadRuns } from './started-thread-run';
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
  readonly onUnauthorized?: () => void;
  readonly onError?: (error: Error) => void;
  readonly onComplete?: (outcome: RunOutcome) => Promise<void> | void;
}

export type ChatRunLifecycle = ReturnType<typeof createChatRunLifecycle>;

/** One lifecycle per surface session. Open or close views without ending their runs. */
export function createChatRunLifecycle(endpoints: RunEndpoints) {
  const activity = createActiveThreadRuns();
  const stopped = createStoppedThreadRuns();
  const handoffs = createStartedThreadRuns(activity.registerActiveThreadRun);
  const events = createRunEventRouting();
  const executor = createRunExecutor(activity, events);
  let sessionResetAt = 0;
  let session = new AbortController();

  function stopThreadRun(threadId: string, transport = endpoints): void {
    stopRun(threadId, transport.cancel, {
      ...stopped,
      abortActiveThreadRun: activity.abortActiveThreadRun,
    });
  }

  return {
    ...activity,
    ...stopped,
    subscribe: events.subscribe,
    run: (
      request: RunExecutionRequest,
      observer: RunRequestObserver = {},
      transport = endpoints,
    ) => executor.run(request, observer, transport),
    stopThreadRun,
    startThreadRun: (request: Parameters<typeof handoffs.startRun>[0]) => {
      handoffs.startRun(request, endpoints.send);
    },
    takeStartedThreadRun: handoffs.takeStartedThreadRun,
    cancelStartedThreadRun: (threadId: string) =>
      handoffs.cancelStartedRun(threadId, stopThreadRun),
    getSessionResetAt: () => sessionResetAt,
    getSessionSignal: () => session.signal,
    reset() {
      sessionResetAt = Date.now();
      const previousSession = session;
      session = new AbortController();
      previousSession.abort();
      executor.reset();
      events.clear();
      handoffs.clearStartedThreadRuns();
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
  readonly isCurrent: () => boolean;
  readonly canReceiveEvents: () => boolean;
}

function routeRequest({
  threadId,
  events,
  observer,
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
    onAbort: messages.flush,
    onCleanup: () => {
      messages.flush();
      if (isCurrent()) events.discard(threadId);
    },
    onComplete: (outcome: RunOutcome) => {
      if (canReceiveEvents()) return observer.onComplete?.(outcome);
    },
  };
}
