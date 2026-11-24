export interface DeferredClientTools {
  readonly contextKey: unknown;
  readonly callIds: ReadonlySet<string>;
}

type Listener = (completion: DeferredClientTools) => void;

export function createDeferredClientTools() {
  const queued = new Map<string, DeferredClientTools>();
  const listeners = new Map<string, Listener>();
  return {
    get: (threadId: string) => queued.get(threadId),
    delete: (threadId: string) => queued.delete(threadId),
    set(threadId: string, completion: DeferredClientTools) {
      queued.set(threadId, completion);
      listeners.get(threadId)?.(completion);
    },
    subscribe(threadId: string, listener: Listener) {
      listeners.set(threadId, listener);
      return () => {
        if (listeners.get(threadId) === listener) listeners.delete(threadId);
      };
    },
    clear() {
      queued.clear();
      listeners.clear();
    },
  };
}
