import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { RunThreadBusyError } from 'src/domain/runs/application/runs.errors';

// A stopped run keeps going until its in-flight tool call returns; in the
// production incident that took 2.4s (AYC-1259).
export const THREAD_RUN_WAIT_MS = 15_000;

/**
 * Lets one run at a time read and write a thread. Runs on the same thread
 * queue in arrival order; a run that cannot start within THREAD_RUN_WAIT_MS
 * fails with RunThreadBusyError instead of interleaving its messages with
 * the run still in progress.
 *
 * The lock lives in this process, which is correct while the backend runs
 * as a single instance. AYC-1258 tracks the move to shared coordination
 * before scaling past one replica.
 */
@Injectable()
export class ThreadRunLock {
  private readonly tails = new Map<UUID, Promise<void>>();

  /**
   * Opens the run once the thread is free and holds the thread until the
   * returned stream completes, fails or is closed.
   */
  async holdWhile<T, R>(
    threadId: UUID,
    open: () => Promise<AsyncGenerator<T, R, void>>,
    signal?: AbortSignal,
  ): Promise<AsyncGenerator<T, R, void>> {
    const release = await this.acquire(threadId, signal);
    try {
      signal?.throwIfAborted();
      return releaseWhenDone(await open(), release);
    } catch (error) {
      release();
      throw error;
    }
  }

  private async acquire(
    threadId: UUID,
    signal?: AbortSignal,
  ): Promise<() => void> {
    signal?.throwIfAborted();
    const previous = this.tails.get(threadId) ?? Promise.resolve();
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => held);
    this.tails.set(threadId, tail);
    void tail.then(() => {
      if (this.tails.get(threadId) === tail) this.tails.delete(threadId);
    });
    try {
      if (!(await settlesWithin(previous, THREAD_RUN_WAIT_MS, signal))) {
        throw new RunThreadBusyError({ threadId });
      }
      return release;
    } catch (error) {
      release();
      throw error;
    }
  }
}

async function settlesWithin(
  promise: Promise<void>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  let onAbort: (() => void) | undefined;
  const timedOutOrAborted = new Promise<boolean>((resolve, reject) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
    onAbort = () =>
      reject(new DOMException('The run was aborted', 'AbortError'));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
  try {
    return await Promise.race([promise.then(() => true), timedOutOrAborted]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}

// A generator function's `finally` never runs when `return()` arrives before
// the first `next()`, which would leave the thread locked; this wrapper
// releases on every way the stream can end.
function releaseWhenDone<T, R>(
  stream: AsyncGenerator<T, R, void>,
  release: () => void,
): AsyncGenerator<T, R, void> {
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    release();
  };
  const settle = async (
    step: () => Promise<IteratorResult<T, R>>,
  ): Promise<IteratorResult<T, R>> => {
    try {
      const result = await step();
      if (result.done) releaseOnce();
      return result;
    } catch (error) {
      releaseOnce();
      throw error;
    }
  };
  const wrapper: AsyncGenerator<T, R, void> = {
    next: () => settle(() => stream.next()),
    throw: (error: unknown) => settle(() => stream.throw(error)),
    return: async (value: R | PromiseLike<R>) => {
      try {
        return await stream.return(value);
      } finally {
        releaseOnce();
      }
    },
    [Symbol.asyncIterator]: () => wrapper,
    [Symbol.asyncDispose]: async () => {
      await wrapper.return(undefined as R);
    },
  };
  return wrapper;
}
