import { EventEmitter } from 'events';
import { sendError, setError } from '@appsignal/nodejs';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import type { RunEventResponseMapper } from '../mappers/run-event-response.mapper';
import { RunSsePresenter } from './run-sse.presenter';

jest.mock('@appsignal/nodejs', () => ({
  sendError: jest.fn(),
  setError: jest.fn(),
}));

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f' as UUID;

class FakeSseResponse extends EventEmitter {
  writableEnded = false;
  setHeader = jest.fn();
  flushHeaders = jest.fn();
  write = jest.fn();
  end = jest.fn(() => {
    this.writableEnded = true;
  });
}

class QuotaExceededError extends ApplicationError {
  constructor() {
    super('Quota exceeded', 'QUOTA_EXCEEDED', 403, {
      retryAfterSeconds: 120,
    });
  }
}

function sessionEvent(timestamp: string): RunEvent {
  return { type: 'session', streaming: true, threadId: THREAD_ID, timestamp };
}

async function* eventsOf(...events: RunEvent[]): AsyncGenerator<RunEvent> {
  for (const event of events) {
    yield event;
  }
  await Promise.resolve();
}

const eventMapper = {
  toDto: jest.fn((event: RunEvent) => ({ mapped: event.type })),
  eventId: jest.fn((event: RunEvent) => `${event.type}-id`),
};

describe('RunSsePresenter', () => {
  let presenter: RunSsePresenter;
  let response: FakeSseResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    presenter = new RunSsePresenter(
      eventMapper as unknown as RunEventResponseMapper,
    );
    response = new FakeSseResponse();
  });

  const stream = (events: AsyncGenerator<RunEvent>) =>
    presenter.stream(response as unknown as Response, THREAD_ID, () => events);

  it('sends sse headers and a connection comment before any event', async () => {
    await stream(eventsOf());

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-cache',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(response.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    expect(response.flushHeaders).toHaveBeenCalled();
    expect(response.write).toHaveBeenCalledWith(
      ': connection established\n\n',
      expect.any(Function),
    );
  });

  it('writes every mapped event with id framing and closes the response', async () => {
    await stream(eventsOf(sessionEvent('t1'), sessionEvent('t2')));

    expect(response.write).toHaveBeenCalledWith(
      `id: session-id\ndata: ${JSON.stringify({ mapped: 'session' })}\n\n`,
      expect.any(Function),
    );
    expect(
      response.write.mock.calls.filter(([chunk]: [string]) =>
        chunk.startsWith('id: '),
      ),
    ).toHaveLength(2);
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('stops forwarding events once the client disconnects', async () => {
    let signal: AbortSignal | undefined;
    async function* disconnectingSource(): AsyncGenerator<RunEvent> {
      yield sessionEvent('t1');
      response.emit('close');
      yield sessionEvent('t2');
    }

    await presenter.stream(
      response as unknown as Response,
      THREAD_ID,
      (sourceSignal) => {
        signal = sourceSignal;
        return disconnectingSource();
      },
    );

    expect(signal?.aborted).toBe(true);
    expect(
      response.write.mock.calls.filter(([chunk]: [string]) =>
        chunk.startsWith('id: '),
      ),
    ).toHaveLength(1);
    expect(response.end).not.toHaveBeenCalled();
  });

  it('treats a socket error as a disconnect instead of crashing', async () => {
    let signal: AbortSignal | undefined;
    async function* erroringSocketSource(): AsyncGenerator<RunEvent> {
      yield sessionEvent('t1');
      response.emit(
        'error',
        Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
      );
      yield sessionEvent('t2');
    }

    await expect(
      presenter.stream(
        response as unknown as Response,
        THREAD_ID,
        (sourceSignal) => {
          signal = sourceSignal;
          return erroringSocketSource();
        },
      ),
    ).resolves.toBeUndefined();

    expect(signal?.aborted).toBe(true);
    expect(
      response.write.mock.calls.filter(([chunk]: [string]) =>
        chunk.startsWith('id: '),
      ),
    ).toHaveLength(1);
    expect(setError).not.toHaveBeenCalled();
    expect(sendError).not.toHaveBeenCalled();
  });

  it('reports a genuine response error event', async () => {
    async function* erroringSocketSource(): AsyncGenerator<RunEvent> {
      yield sessionEvent('t1');
      response.emit(
        'error',
        Object.assign(new Error('response device failed'), { code: 'EIO' }),
      );
    }

    await stream(erroringSocketSource());

    expect(sendError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'SSE_RESPONSE_WRITE_FAILED',
        code: 'SSE_RESPONSE_WRITE_FAILED',
      }),
    );
    expect(setError).not.toHaveBeenCalled();
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('does not start the run when opening the response fails synchronously', async () => {
    const eventSource = jest.fn(() => eventsOf(sessionEvent('t1')));
    response.write.mockImplementation((chunk: string) => {
      if (chunk === ': connection established\n\n') {
        throw Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
      }
      return true;
    });

    await presenter.stream(
      response as unknown as Response,
      THREAD_ID,
      eventSource,
    );

    expect(eventSource).not.toHaveBeenCalled();
  });

  it('contains an asynchronous EPIPE from an event write as a disconnect', async () => {
    let signal: AbortSignal | undefined;
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          const error = Object.assign(new Error('write EPIPE'), {
            code: 'EPIPE',
          });
          queueMicrotask(() => callback?.(error));
        }
        return true;
      },
    );

    await presenter.stream(
      response as unknown as Response,
      THREAD_ID,
      (sourceSignal) => {
        signal = sourceSignal;
        return eventsOf(sessionEvent('t1'));
      },
    );

    expect(signal?.aborted).toBe(true);
    expect(setError).not.toHaveBeenCalled();
  });

  it('reports a non-disconnect asynchronous event write failure', async () => {
    const writeError = Object.assign(new Error('write timed out'), {
      code: 'ETIMEDOUT',
    });
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          queueMicrotask(() => callback?.(writeError));
        }
        return true;
      },
    );

    await stream(eventsOf(sessionEvent('t1')));

    expect(setError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'SSE_RESPONSE_WRITE_FAILED',
        code: 'SSE_RESPONSE_WRITE_FAILED',
        cause: writeError,
      }),
    );
  });

  it('reports a non-EPIPE write failure after a disconnect race', async () => {
    let writeCallback: ((error?: Error | null) => void) | undefined;
    async function* disconnectingSource(): AsyncGenerator<RunEvent> {
      yield sessionEvent('t1');
      response.emit('close');
    }
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          writeCallback = callback;
        }
        return true;
      },
    );

    await stream(disconnectingSource());
    const error = Object.assign(new Error('write failed'), { code: 'EIO' });
    writeCallback?.(error);

    expect(sendError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'SSE_RESPONSE_WRITE_FAILED',
        code: 'SSE_RESPONSE_WRITE_FAILED',
        cause: error,
      }),
    );
    expect(setError).not.toHaveBeenCalled();
  });

  it('reports a callback and response event for one failure only once', async () => {
    let writeCallback: ((error?: Error | null) => void) | undefined;
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          writeCallback = callback;
        }
        return true;
      },
    );

    await stream(eventsOf(sessionEvent('t1')));
    const error = Object.assign(new Error('response device failed'), {
      code: 'EIO',
    });
    writeCallback?.(error);
    response.emit('error', error);

    expect(sendError).toHaveBeenCalledTimes(1);
  });

  it('contains an AppSignal failure inside a write callback', async () => {
    let writeCallback: ((error?: Error | null) => void) | undefined;
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          writeCallback = callback;
        }
        return true;
      },
    );
    (sendError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('AppSignal unavailable');
    });

    await stream(eventsOf(sessionEvent('t1')));
    const error = Object.assign(new Error('response device failed'), {
      code: 'EIO',
    });

    expect(() => writeCallback?.(error)).not.toThrow();
  });

  it('contains a late asynchronous EPIPE after response teardown', async () => {
    let writeCallback: ((error?: Error | null) => void) | undefined;
    response.write.mockImplementation(
      (chunk: string, callback?: (error?: Error | null) => void) => {
        if (chunk.startsWith('id: ')) {
          writeCallback = callback;
        }
        return true;
      },
    );

    await stream(eventsOf(sessionEvent('t1')));
    const error = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    writeCallback?.(error);

    expect(writeCallback).toBeDefined();
    expect(setError).not.toHaveBeenCalled();
  });

  it('writes an execution error event preserving the domain error code', async () => {
    // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
    async function* failingSource(): AsyncGenerator<RunEvent> {
      throw new QuotaExceededError();
    }

    await stream(failingSource());

    const errorFrame = response.write.mock.calls
      .map(([chunk]: [string]) => chunk)
      .find((chunk) => chunk.startsWith('id: execution-error'));
    expect(errorFrame).toBeDefined();
    const payload = JSON.parse(
      (errorFrame as string).split('data: ')[1],
    ) as Record<string, unknown>;
    expect(payload.code).toBe('QUOTA_EXCEEDED');
    expect(payload.message).toBe('Quota exceeded');
    expect(payload.details).toEqual({ retryAfterSeconds: 120 });
    expect(JSON.stringify(payload)).not.toContain('    at ');
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('falls back to EXECUTION_ERROR for unexpected errors', async () => {
    // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
    async function* failingSource(): AsyncGenerator<RunEvent> {
      throw new Error('connection terminated unexpectedly');
    }

    await stream(failingSource());

    const errorFrame = response.write.mock.calls
      .map(([chunk]: [string]) => chunk)
      .find((chunk) => chunk.startsWith('id: execution-error'));
    const payload = JSON.parse(
      (errorFrame as string).split('data: ')[1],
    ) as Record<string, unknown>;
    expect(payload.code).toBe('EXECUTION_ERROR');
  });

  it('does not abort the event source after normal completion', async () => {
    let signal: AbortSignal | undefined;

    await presenter.stream(
      response as unknown as Response,
      THREAD_ID,
      (sourceSignal) => {
        signal = sourceSignal;
        return eventsOf(sessionEvent('t1'));
      },
    );

    expect(signal?.aborted).toBe(false);
  });

  it('cleans up connection tracking when opening the response throws', async () => {
    jest.useFakeTimers();
    try {
      const openError = new Error('failed to flush response headers');
      response.flushHeaders.mockImplementation(() => {
        throw openError;
      });

      await expect(stream(eventsOf())).rejects.toBe(openError);

      expect(jest.getTimerCount()).toBe(0);
      expect(response.listenerCount('close')).toBe(0);
      expect(response.listenerCount('error')).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cleans up connection tracking when ending the response throws', async () => {
    const endError = new Error('failed to end response');
    response.end.mockImplementation(() => {
      throw endError;
    });

    await expect(stream(eventsOf())).rejects.toBe(endError);

    expect(response.listenerCount('close')).toBe(0);
    expect(response.listenerCount('error')).toBe(0);
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('writes heartbeat comments while the stream is idle', async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      async function* idleSource(): AsyncGenerator<RunEvent> {
        await gate;
        yield sessionEvent('t1');
      }

      const streaming = stream(idleSource());
      await jest.advanceTimersByTimeAsync(15_000);

      expect(response.write).toHaveBeenCalledWith(
        ': heartbeat\n\n',
        expect.any(Function),
      );

      release();
      await streaming;
    });

    it('stops the heartbeat after the stream completes', async () => {
      await stream(eventsOf(sessionEvent('t1')));
      response.write.mockClear();

      await jest.advanceTimersByTimeAsync(60_000);

      expect(response.write).not.toHaveBeenCalled();
    });

    it('contains a heartbeat write failure instead of throwing', async () => {
      let signal: AbortSignal | undefined;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      async function* idleSource(): AsyncGenerator<RunEvent> {
        await gate;
        yield sessionEvent('t1');
      }
      response.write.mockImplementation((chunk: string) => {
        if (chunk === ': heartbeat\n\n') {
          throw Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
        }
        return true;
      });

      const streaming = presenter.stream(
        response as unknown as Response,
        THREAD_ID,
        (sourceSignal) => {
          signal = sourceSignal;
          return idleSource();
        },
      );
      await expect(
        jest.advanceTimersByTimeAsync(30_000),
      ).resolves.toBeUndefined();

      expect(signal?.aborted).toBe(true);
      release();
      await streaming;
    });
  });
});
