import { useCallback, useSyncExternalStore } from 'react';
import type { ChatRunLifecycle } from './run-lifecycle';

export function useRuntimeSession(lifecycle: ChatRunLifecycle): AbortSignal {
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
