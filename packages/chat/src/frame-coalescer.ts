interface FrameCoalescer<T> {
  push: (item: T) => void;
  /** Delivers pending items now instead of on the next animation frame. */
  flush: () => void;
}

/**
 * Collects items and delivers them at most once per animation frame, keeping
 * only the latest item per key. Keys keep the order of their first push.
 */
export function createFrameCoalescer<T>(
  keyOf: (item: T) => string,
  onFlush: (items: T[]) => void,
): FrameCoalescer<T> {
  const pending = new Map<string, T>();
  let frame: number | null = null;

  const flush = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    if (pending.size === 0) return;
    const items = [...pending.values()];
    pending.clear();
    onFlush(items);
  };

  return {
    push: (item) => {
      pending.set(keyOf(item), item);
      frame ??= requestAnimationFrame(flush);
    },
    flush,
  };
}
