import type { ThreadRunLock } from 'src/domain/runs/application/services/thread-run-lock.service';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import type { RunStreamItem } from 'src/domain/runs/domain/run-pii-masks-update.entity';
import type { ExecuteRunCommand } from './execute-run.command';

type RunStream = AsyncGenerator<RunStreamItem, RunExecutionOutcome, void>;

export async function openThreadRun(
  lock: ThreadRunLock,
  command: ExecuteRunCommand,
  open: () => Promise<RunStream>,
): Promise<RunStream> {
  try {
    return await lock.holdWhile(command.threadId, open, command.signal);
  } catch (error) {
    if (!isRunCancellation(error, command.signal)) throw error;
    return abortedRun();
  }
}

function isRunCancellation(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true &&
    (error === signal.reason ||
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'))
  );
}

// eslint-disable-next-line @typescript-eslint/require-await -- Cancelled runs use the async stream contract without doing I/O.
async function* abortedRun(): RunStream {
  yield* [];
  return 'aborted';
}
