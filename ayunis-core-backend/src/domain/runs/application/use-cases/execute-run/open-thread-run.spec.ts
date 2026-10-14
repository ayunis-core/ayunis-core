import type { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { RunTerminalEvent } from 'src/domain/runs/application/events/run-terminal.event';
import { RunTelemetryService } from 'src/domain/runs/application/services/run-telemetry.service';
import { ThreadRunLock } from 'src/domain/runs/application/services/thread-run-lock.service';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { ExecuteRunCommand } from './execute-run.command';
import { openThreadRun } from './open-thread-run';

describe('openThreadRun', () => {
  it.each([undefined, new Error('socket disconnected')])(
    'records queued cancellation as aborted without opening the run (%s)',
    async (reason) => {
      const emitAsync = jest.fn().mockResolvedValue([]);
      const telemetry = new RunTelemetryService({
        emitAsync,
      } as unknown as EventEmitter2);
      const lock = new ThreadRunLock();
      const controller = new AbortController();
      const command = new ExecuteRunCommand({
        threadId: randomUUID(),
        input: new RunUserInput('Cancelled question'),
        signal: controller.signal,
      });
      const first = await lock.holdWhile(command.threadId, async () =>
        (async function* () {
          yield 'first';
          return 'completed';
        })(),
      );
      const open = jest.fn();
      const waiting = telemetry.track('agent_runtime', () =>
        openThreadRun(lock, command, open),
      );
      controller.abort(reason);
      const cancelled = await waiting;
      expect(await cancelled.next()).toEqual({ done: true, value: 'aborted' });
      expect(open).not.toHaveBeenCalled();
      expect(emitAsync).toHaveBeenCalledWith(
        RunTerminalEvent.EVENT_NAME,
        expect.objectContaining({ outcome: 'aborted' }),
      );
      await first.return('closed');
    },
  );

  it('keeps an unrelated preparation error when cancellation happens concurrently', async () => {
    const controller = new AbortController();
    const command = new ExecuteRunCommand({
      threadId: randomUUID(),
      input: new RunUserInput('Question'),
      signal: controller.signal,
    });
    const failure = new Error('database connection lost');
    await expect(
      openThreadRun(new ThreadRunLock(), command, async () => {
        controller.abort();
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
