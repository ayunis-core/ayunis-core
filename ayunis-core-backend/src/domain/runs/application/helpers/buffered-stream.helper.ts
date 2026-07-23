import type { Observable, Subscription } from 'rxjs';

interface BufferedStreamState {
  completed: boolean;
  error: Error | null;
}

/**
 * Bridges an RxJS Observable to an AsyncIterable while recording every
 * emitted value in the caller-owned `buffer` (the caller reads it afterwards,
 * e.g. for usage extraction). Invokes `onComplete` only when the source
 * completed successfully and the consumer drained every buffered value.
 */
export function observableToBufferedAsyncIterable<T>(
  source$: Observable<T>,
  buffer: T[],
  onComplete: () => void,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () =>
      createBufferedIterator(source$, buffer, onComplete),
  };
}

function subscribeBuffering<T>(
  source$: Observable<T>,
  buffer: T[],
  state: BufferedStreamState,
): Subscription {
  return source$.subscribe({
    next: (value) => {
      buffer.push(value);
    },
    error: (err) => {
      state.error = err as Error;
      state.completed = true;
    },
    complete: () => {
      state.completed = true;
    },
  });
}

function createBufferedIterator<T>(
  source$: Observable<T>,
  buffer: T[],
  onComplete: () => void,
): AsyncIterator<T, void> {
  const state: BufferedStreamState = { completed: false, error: null };
  let consumedIndex = 0;
  const subscription = subscribeBuffering(source$, buffer, state);

  return {
    async next() {
      while (consumedIndex >= buffer.length && !state.completed) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (state.error) {
        subscription.unsubscribe();
        throw state.error;
      }

      if (consumedIndex < buffer.length) {
        const value = buffer[consumedIndex++];
        return { value, done: false };
      }

      subscription.unsubscribe();
      onComplete();
      return { done: true, value: undefined };
    },
    // Called when the consumer breaks out of for-await (e.g. client
    // disconnect) — without it the provider stream stays subscribed and
    // keeps buffering chunks for the rest of the generation.
    return(): Promise<IteratorReturnResult<void>> {
      subscription.unsubscribe();
      return Promise.resolve({ done: true, value: undefined });
    },
    throw(err?: unknown): Promise<IteratorResult<T, void>> {
      subscription.unsubscribe();
      return Promise.reject(
        err instanceof Error ? err : new Error(String(err)),
      );
    },
  };
}
