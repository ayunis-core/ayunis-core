import type { EventEmitter2 } from '@nestjs/event-emitter';
import { RunContext } from '@ayunis/agent-runtime';
import { randomUUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { RunMaxIterationsReachedError } from 'src/domain/runs/application/runs.errors';
import { RunTerminalEvent } from 'src/domain/runs/application/events/run-terminal.event';
import { RunExecutedEvent } from 'src/domain/runs/application/events/run-executed.event';
import { RunTelemetryService } from './run-telemetry.service';

async function drain<T>(generator: AsyncGenerator<T, unknown, void>) {
  let result = await generator.next();
  while (!result.done) result = await generator.next();
  return result.value;
}

describe('RunTelemetryService', () => {
  const paths = ['legacy', 'agent_runtime'] as const;
  const eventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EventEmitter2>;
  const service = new RunTelemetryService(eventEmitter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records attempted runs for the existing activity metric', () => {
    const userId = randomUUID();
    const orgId = randomUUID();

    service.recordAttempt(userId, orgId);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunExecutedEvent.EVENT_NAME,
      new RunExecutedEvent(userId, orgId),
    );
  });

  it.each(paths)('records completed runs for the %s path', async (path) => {
    const stream = await service.track(path, async () =>
      (async function* () {
        yield* [] as never[];
        return 'completed' as const;
      })(),
    );

    await drain(stream);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunTerminalEvent.EVENT_NAME,
      expect.objectContaining({ executionPath: path, outcome: 'completed' }),
    );
  });

  it('logs the correlated end-to-end run duration', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'));
    const logger = createLoggerMock();
    const context = RunContext.create();
    context.set('agentTelemetryModel', 'claude-sonnet-4-5');
    context.set('agentTelemetryProvider', 'anthropic');
    const stream = await service.track(
      'agent_runtime',
      async () =>
        (async function* () {
          jest.setSystemTime(new Date('2026-09-21T12:00:02.000Z'));
          yield* [] as never[];
          return 'completed' as const;
        })(),
      context,
    );

    await drain(stream);

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: context.runId,
        model: 'claude-sonnet-4-5',
        provider: 'anthropic',
        environment: expect.any(String),
        started_at: '2026-09-21T12:00:00.000Z',
        completed_at: '2026-09-21T12:00:02.000Z',
        duration_ms: 2_000,
        outcome: 'completed',
      }),
      'Run reached terminal outcome',
    );
    jest.useRealTimers();
  });

  it.each(paths)('records an aborted run for the %s path', async (path) => {
    const stream = await service.track(path, async () =>
      (async function* () {
        yield* [] as never[];
        return 'aborted' as const;
      })(),
    );

    await drain(stream);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunTerminalEvent.EVENT_NAME,
      expect.objectContaining({ outcome: 'aborted' }),
    );
  });

  it.each(paths)(
    'records a preparation error for the %s path',
    async (path) => {
      const failure = new Error('Thread lookup failed');

      await expect(
        service.track(path, async () => Promise.reject(failure)),
      ).rejects.toBe(failure);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        RunTerminalEvent.EVENT_NAME,
        expect.objectContaining({ outcome: 'error' }),
      );
    },
  );

  it.each(paths)(
    'records max_iterations instead of a generic error for the %s path',
    async (path) => {
      const stream = await service.track(path, async () =>
        (async function* () {
          yield* [] as never[];
          throw new RunMaxIterationsReachedError(50);
        })(),
      );

      await expect(drain(stream)).rejects.toBeInstanceOf(
        RunMaxIterationsReachedError,
      );
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        RunTerminalEvent.EVENT_NAME,
        expect.objectContaining({ outcome: 'max_iterations' }),
      );
    },
  );

  it('records an aborted outcome when a consumer closes an unstarted stream', async () => {
    const stream = await service.track('agent_runtime', async () =>
      (async function* () {
        yield 'partial response';
        return 'completed' as const;
      })(),
    );

    await stream.return('completed');

    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunTerminalEvent.EVENT_NAME,
      expect.objectContaining({ outcome: 'aborted' }),
    );
  });

  it('records exactly one terminal outcome when a consumer abandons the stream', async () => {
    const stream = await service.track('legacy', async () =>
      (async function* () {
        yield 'partial response';
        return 'completed' as const;
      })(),
    );

    await stream.next();
    await stream.return('completed');

    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunTerminalEvent.EVENT_NAME,
      expect.objectContaining({ outcome: 'aborted' }),
    );
  });
});
