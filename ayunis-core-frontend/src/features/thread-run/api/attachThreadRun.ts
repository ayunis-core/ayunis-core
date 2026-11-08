import config from '@/shared/config';

/**
 * Opens the stream of the run in progress on a thread: the run so far, then
 * live events until it ends. Responds 204 when the thread has no run.
 */
export function attachThreadRun(
  threadId: string,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${config.api.baseUrl}/runs/threads/${threadId}/events`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    credentials: 'include',
    signal,
  });
}
