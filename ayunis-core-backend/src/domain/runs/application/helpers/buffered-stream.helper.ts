import type { Observable } from 'rxjs';

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
    [Symbol.asyncIterator]() {
      let completed = false;
      let error: Error | null = null;
      let consumedIndex = 0;

      const subscription = source$.subscribe({
        next: (value) => {
          buffer.push(value);
        },
        error: (err) => {
          error = err as Error;
          completed = true;
        },
        complete: () => {
          completed = true;
        },
      });

      return {
        async next() {
          while (consumedIndex >= buffer.length && !completed) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          if (error) {
            subscription.unsubscribe();
            throw error;
          }

          if (consumedIndex < buffer.length) {
            const value = buffer[consumedIndex++];
            return { value, done: false } as IteratorResult<T, void>;
          } else {
            subscription.unsubscribe();
            onComplete();
            return {
              done: true,
              value: undefined,
            } as IteratorReturnResult<void>;
          }
        },
      };
    },
  } as AsyncIterable<T>;
}
