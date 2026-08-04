/**
 * Forwards an abort (and its reason) from a source signal onto a target
 * controller. Needed wherever a provider call runs on its own controller —
 * e.g. so a stall watchdog can abort one attempt without consuming the
 * caller's signal. Returns a cleanup that detaches the listener.
 */
export function relayAbort(
  source: AbortSignal | undefined,
  target: AbortController,
): () => void {
  if (!source) return () => undefined;
  const abort = () => target.abort(source.reason);
  if (source.aborted) {
    abort();
    return () => undefined;
  }
  source.addEventListener('abort', abort, { once: true });
  return () => source.removeEventListener('abort', abort);
}
