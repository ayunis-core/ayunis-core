import { useLayoutEffect, useRef, useState } from 'react';

export function useChatAction(
  onError?: (error: unknown) => void,
  enabled = true,
) {
  const controller = useRef<AbortController | null>(null);
  const [request, setRequest] = useState<AbortController | null>(null);

  useLayoutEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [enabled],
  );

  async function run(
    action: (signal: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    if (!enabled || controller.current) return false;
    const active = new AbortController();
    controller.current = active;
    setRequest(active);
    try {
      await action(active.signal);
      return !active.signal.aborted;
    } catch (error) {
      if (!active.signal.aborted) onError?.(error);
      return false;
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setRequest(null);
      }
    }
  }
  return { busy: enabled && Boolean(request && !request.signal.aborted), run };
}
