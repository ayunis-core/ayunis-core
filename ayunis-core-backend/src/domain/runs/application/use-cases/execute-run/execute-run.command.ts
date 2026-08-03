import type { RunInput } from 'src/domain/runs/domain/run-input.entity';
import type { UUID } from 'crypto';

export class ExecuteRunCommand {
  readonly threadId: UUID;
  // input is separate from thread because tool results need to be
  // stored alongside results from tools collected by the run
  readonly input: RunInput;
  // Enable streaming mode for real-time responses
  readonly streaming?: boolean;
  readonly signal?: AbortSignal;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    streaming?: boolean;
    signal?: AbortSignal;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.streaming = true;
    this.signal = params.signal;
  }
}
