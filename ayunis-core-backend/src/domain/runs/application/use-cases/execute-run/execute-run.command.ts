import type { RunInput } from 'src/domain/runs/domain/run-input.entity';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import type { UUID } from 'crypto';

export class ExecuteRunCommand {
  readonly threadId: UUID;
  // input is separate from thread because tool results need to be
  // stored alongside results from tools collected by the run
  readonly input: RunInput;
  readonly profile: RunProfileInput;
  // Enable streaming mode for real-time responses
  readonly streaming?: boolean;
  readonly signal?: AbortSignal;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    profile: RunProfileInput;
    streaming?: boolean;
    signal?: AbortSignal;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.profile = params.profile;
    this.streaming = true;
    this.signal = params.signal;
  }
}
