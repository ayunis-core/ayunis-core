import {
  registerActiveThreadRun,
  unregisterActiveThreadRun,
} from './active-thread-run';
import type { RunEndpoints, RunMessagePayload } from './run-endpoints';
import { readRunEvents, type RunEvent } from './run-stream';

export interface StartedRunRequest {
  controller: AbortController;
  response: Promise<Response>;
}

export interface RunExecutionRequest extends RunMessagePayload {
  startedRequest?: StartedRunRequest;
  isAttach?: boolean;
}

export interface RunOutcome {
  failed: boolean;
  unauthorized: boolean;
  reattachFailed: boolean;
}

interface RunExecutionHandlers {
  onEvent: (event: RunEvent) => void;
  onUnauthorized: () => void;
  onError: (error: Error) => void;
  onCleanup: () => void;
  onAbort: () => void;
  onComplete: (outcome: RunOutcome) => Promise<void> | void;
}

function requestRun(
  endpoints: RunEndpoints,
  { startedRequest, isAttach, ...message }: RunExecutionRequest,
  signal: AbortSignal,
): Promise<Response> {
  if (startedRequest) return startedRequest.response;
  if (!isAttach) return endpoints.send(message, signal);
  if (!endpoints.follow) throw new Error('This endpoint cannot follow a run');
  return endpoints.follow(message.threadId, signal);
}

async function consumeRun(
  response: Response,
  outcome: RunOutcome,
  handlers: RunExecutionHandlers,
): Promise<void> {
  if (response.status === 401) {
    outcome.unauthorized = true;
    outcome.failed = true;
    handlers.onUnauthorized();
    return;
  }
  if (response.status === 204) return;
  if (!response.ok) {
    const errorText = await response.text();
    console.error('HTTP error:', { status: response.status, errorText });
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`,
    );
  }
  if (!response.body) throw new Error('No response body');

  await readRunEvents(response.body, (event) => {
    if (event.type === 'error') outcome.failed = true;
    handlers.onEvent(event);
  });
}

export async function executeRun(
  endpoints: RunEndpoints,
  request: RunExecutionRequest,
  handlers: RunExecutionHandlers,
): Promise<void> {
  const controller =
    request.startedRequest?.controller ?? new AbortController();
  const outcome = { failed: false, unauthorized: false, reattachFailed: false };
  let aborted = false;
  try {
    registerActiveThreadRun(request.threadId, controller);
    controller.signal.addEventListener('abort', handlers.onAbort);
    const response = await requestRun(endpoints, request, controller.signal);
    await consumeRun(response, outcome, handlers);
  } catch (error) {
    console.error('Error in sendMessage', error);
    if (error instanceof Error && error.name === 'AbortError') {
      aborted = true;
      return;
    }
    outcome.failed = true;
    if (request.isAttach) {
      outcome.reattachFailed = true;
      throw error;
    }
    if (error instanceof Error) handlers.onError(error);
  } finally {
    controller.signal.removeEventListener('abort', handlers.onAbort);
    try {
      handlers.onCleanup();
    } finally {
      unregisterActiveThreadRun(request.threadId, controller);
    }
    if (!aborted) await handlers.onComplete(outcome);
  }
}
