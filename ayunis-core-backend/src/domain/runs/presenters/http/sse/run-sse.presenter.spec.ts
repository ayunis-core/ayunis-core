import { EventEmitter } from 'events';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import type { RunEventResponseMapper } from '../mappers/run-event-response.mapper';
import { RunSsePresenter } from './run-sse.presenter';

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

class UnexpectedRunError extends ApplicationError {
  constructor() {
    super('database connection string leaked', 'UNEXPECTED_RUN', 500, {
      connectionString: 'postgres://user:secret@database/internal',
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
    expect(response.write).toHaveBeenCalledWith(': connection established\n\n');
  });

  it('writes every mapped event with id framing and closes the response', async () => {
    await stream(eventsOf(sessionEvent('t1'), sessionEvent('t2')));

    expect(response.write).toHaveBeenCalledWith(
      `id: session-id\ndata: ${JSON.stringify({ mapped: 'session' })}\n\n`,
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
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('treats a socket error as a disconnect instead of crashing', async () => {
    let signal: AbortSignal | undefined;
    async function* erroringSocketSource(): AsyncGenerator<RunEvent> {
      yield sessionEvent('t1');
      response.emit('error', new Error('ECONNRESET'));
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

  it('does not expose domain server-error details', async () => {
    // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
    async function* failingSource(): AsyncGenerator<RunEvent> {
      throw new UnexpectedRunError();
    }

    await stream(failingSource());

    const errorFrame = response.write.mock.calls
      .map(([chunk]: [string]) => chunk)
      .find((chunk) => chunk.startsWith('id: execution-error'));
    const payload = JSON.parse(
      (errorFrame as string).split('data: ')[1],
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      code: 'UNEXPECTED_RUN',
      message: 'Internal server error',
    });
    expect(payload.details).toBeUndefined();
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
    expect(payload.message).toBe('Internal server error');
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

      expect(response.write).toHaveBeenCalledWith(': heartbeat\n\n');

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
          throw new Error('write EPIPE');
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
