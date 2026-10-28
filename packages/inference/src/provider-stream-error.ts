import {
  normalizeProviderError,
  type NormalizeProviderErrorOptions,
} from './provider-error';

/**
 * Wraps failures raised by `iterator.next()` while leaving conversion performed
 * by the caller outside the provider boundary. Incomplete iterators are closed
 * best-effort; cleanup cannot replace a primary failure or fail abandonment.
 */
export async function* normalizeProviderStreamErrors<T>(
  iterable: AsyncIterable<T>,
  options: NormalizeProviderErrorOptions,
): AsyncGenerator<T, void, unknown> {
  const iterator = iterable[Symbol.asyncIterator]();
  let completed = false;
  try {
    while (!completed) {
      const result = await nextProviderResult(iterator, options);
      if (result.done) {
        throwIfCancelledAtCompletion(options);
        completed = true;
      } else yield result.value;
    }
  } finally {
    if (!completed) await suppressIteratorReturn(iterator);
  }
}

function throwIfCancelledAtCompletion(
  options: NormalizeProviderErrorOptions,
): void {
  if (options.timeoutSignal?.aborted) {
    throw normalizeProviderError(options.timeoutSignal.reason, options);
  }
  if (options.signal?.aborted) {
    throw normalizeProviderError(options.signal.reason, options);
  }
}

async function nextProviderResult<T>(
  iterator: AsyncIterator<T>,
  options: NormalizeProviderErrorOptions,
): Promise<IteratorResult<T>> {
  try {
    return await iterator.next();
  } catch (error) {
    throw normalizeProviderError(error, options);
  }
}

async function suppressIteratorReturn<T>(
  iterator: AsyncIterator<T>,
): Promise<void> {
  try {
    await iterator.return?.();
  } catch {
    return;
  }
}
