export interface RunFinalizer {
  finalize(): Promise<void>;
}

export const createRunFinalizer = (
  cleanup: () => void | Promise<void>,
): RunFinalizer => {
  let finalization: Promise<void> | undefined;
  return Object.freeze({
    finalize: () => {
      finalization ??= Promise.resolve().then(cleanup);
      return finalization;
    },
  });
};

export async function* finalizeRun<Event>(
  events: AsyncIterable<Event>,
  finalizer: RunFinalizer,
): AsyncGenerator<Event> {
  const iterator = events[Symbol.asyncIterator]();
  let completed = false;
  try {
    for (;;) {
      const next = await iterator.next();
      if (next.done) {
        completed = true;
        return;
      }
      yield next.value;
    }
  } finally {
    try {
      if (!completed) await iterator.return?.();
    } finally {
      await finalizer.finalize();
    }
  }
}
