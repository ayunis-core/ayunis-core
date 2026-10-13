import { randomUUID } from 'crypto';
import { RunThreadBusyError } from 'src/domain/runs/application/runs.errors';
import { THREAD_RUN_WAIT_MS, ThreadRunLock } from './thread-run-lock.service';

interface Gate {
  open: () => void;
  opened: Promise<void>;
}

function gate(): Gate {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { open, opened };
}

async function* streamUntil(
  done: Promise<void>,
  log: string[],
  name: string,
): AsyncGenerator<string, string, void> {
  log.push(`${name}:start`);
  yield `${name}:item`;
  await done;
  log.push(`${name}:end`);
  return name;
}

async function drain<T, R>(stream: AsyncGenerator<T, R, void>): Promise<R> {
  for (;;) {
    const next = await stream.next();
    if (next.done) return next.value;
  }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('ThreadRunLock', () => {
  it('opens a second run on a thread only after the first stream ends', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();
    const log: string[] = [];
    const firstDone = gate();

    const first = await lock.holdWhile(threadId, async () =>
      streamUntil(firstDone.opened, log, 'first'),
    );
    const firstResult = drain(first);
    const secondOpened = lock.holdWhile(threadId, async () => {
      log.push('second:open');
      return streamUntil(Promise.resolve(), log, 'second');
    });
    await flush();
    expect(log).toEqual(['first:start']);

    firstDone.open();
    await firstResult;
    await drain(await secondOpened);

    expect(log).toEqual([
      'first:start',
      'first:end',
      'second:open',
      'second:start',
      'second:end',
    ]);
  });

  it('removes a cancelled waiter promptly without opening it or blocking the next run', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();
    const controller = new AbortController();
    const first = await lock.holdWhile(threadId, async () =>
      streamUntil(Promise.resolve(), [], 'first'),
    );
    const openCancelled = jest
      .fn()
      .mockImplementation(async () =>
        streamUntil(Promise.resolve(), [], 'cancelled'),
      );
    let cancellation: unknown;
    const cancelled = lock
      .holdWhile(threadId, openCancelled, controller.signal)
      .then(drain)
      .catch((error: unknown) => {
        cancellation = error;
      });
    const next = lock.holdWhile(threadId, async () =>
      streamUntil(Promise.resolve(), [], 'next'),
    );
    controller.abort();
    await flush();
    try {
      expect(cancellation).toMatchObject({ name: 'AbortError' });
      expect(openCancelled).not.toHaveBeenCalled();
    } finally {
      await first.return('closed');
      await cancelled;
      await drain(await next);
    }
  });

  it('does not open a run whose signal is already aborted', async () => {
    const lock = new ThreadRunLock();
    const controller = new AbortController();
    controller.abort();
    const open = jest
      .fn()
      .mockImplementation(async () =>
        streamUntil(Promise.resolve(), [], 'cancelled'),
      );
    const result = await lock
      .holdWhile(randomUUID(), open, controller.signal)
      .catch((error: unknown) => error);
    expect(open).not.toHaveBeenCalled();
    expect(result).toMatchObject({ name: 'AbortError' });
  });

  it('runs streams on different threads concurrently', async () => {
    const lock = new ThreadRunLock();
    const log: string[] = [];
    const firstDone = gate();

    const first = await lock.holdWhile(randomUUID(), async () =>
      streamUntil(firstDone.opened, log, 'first'),
    );
    const firstResult = drain(first);
    await drain(
      await lock.holdWhile(randomUUID(), async () =>
        streamUntil(Promise.resolve(), log, 'other'),
      ),
    );

    expect(log).toEqual(['first:start', 'other:start', 'other:end']);
    firstDone.open();
    await firstResult;
  });

  it('rejects a run that waited too long without opening it', async () => {
    jest.useFakeTimers();
    try {
      const lock = new ThreadRunLock();
      const threadId = randomUUID();
      const open = jest.fn();
      const first = await lock.holdWhile(threadId, async () =>
        streamUntil(new Promise<void>(() => undefined), [], 'first'),
      );
      void first.next();

      const second = lock.holdWhile(threadId, open);
      const rejection =
        expect(second).rejects.toBeInstanceOf(RunThreadBusyError);
      await jest.advanceTimersByTimeAsync(THREAD_RUN_WAIT_MS);

      await rejection;
      expect(open).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('lets the next run in after a waiter gave up', async () => {
    jest.useFakeTimers();
    try {
      const lock = new ThreadRunLock();
      const threadId = randomUUID();
      const log: string[] = [];
      const firstDone = gate();
      const first = await lock.holdWhile(threadId, async () =>
        streamUntil(firstDone.opened, log, 'first'),
      );
      const firstResult = drain(first);
      const timedOut = lock.holdWhile(threadId, jest.fn());
      const rejection =
        expect(timedOut).rejects.toBeInstanceOf(RunThreadBusyError);
      await jest.advanceTimersByTimeAsync(THREAD_RUN_WAIT_MS);
      await rejection;

      firstDone.open();
      await firstResult;
      await drain(
        await lock.holdWhile(threadId, async () =>
          streamUntil(Promise.resolve(), log, 'third'),
        ),
      );

      expect(log).toEqual([
        'first:start',
        'first:end',
        'third:start',
        'third:end',
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('releases the thread when the stream fails', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();
    async function* failing(): AsyncGenerator<string, string, void> {
      yield 'item';
      throw new Error('provider failed');
    }

    await expect(
      drain(await lock.holdWhile(threadId, async () => failing())),
    ).rejects.toThrow('provider failed');

    await expect(
      drain(
        await lock.holdWhile(threadId, async () =>
          streamUntil(Promise.resolve(), [], 'next'),
        ),
      ),
    ).resolves.toBe('next');
  });

  it('releases the thread when the consumer closes the stream early', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();
    const stream = await lock.holdWhile(threadId, async () =>
      streamUntil(new Promise<void>(() => undefined), [], 'first'),
    );
    await stream.next();

    await stream.return('closed');

    await expect(
      drain(
        await lock.holdWhile(threadId, async () =>
          streamUntil(Promise.resolve(), [], 'next'),
        ),
      ),
    ).resolves.toBe('next');
  });

  it('releases the thread when the consumer closes the stream before reading it', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();
    const stream = await lock.holdWhile(threadId, async () =>
      streamUntil(new Promise<void>(() => undefined), [], 'first'),
    );

    await stream.return('closed');

    await expect(
      drain(
        await lock.holdWhile(threadId, async () =>
          streamUntil(Promise.resolve(), [], 'next'),
        ),
      ),
    ).resolves.toBe('next');
  });

  it('releases the thread when opening the run fails', async () => {
    const lock = new ThreadRunLock();
    const threadId = randomUUID();

    await expect(
      lock.holdWhile(threadId, () =>
        Promise.reject(new Error('no model configured')),
      ),
    ).rejects.toThrow('no model configured');

    await expect(
      drain(
        await lock.holdWhile(threadId, async () =>
          streamUntil(Promise.resolve(), [], 'next'),
        ),
      ),
    ).resolves.toBe('next');
  });
});
