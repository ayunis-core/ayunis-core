import type { UUID } from 'crypto';
import type { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';

export class ExecuteUnattendedRunCommand {
  readonly threadId: UUID;
  /** The task; nudges follow as further user messages on the same thread. */
  readonly input: RunUserInput;
  readonly profile: RunProfileInput;
  /** Required: no client is listening, so only the caller can stop the run. */
  readonly signal: AbortSignal;

  constructor(params: {
    threadId: UUID;
    input: RunUserInput;
    profile: RunProfileInput;
    signal: AbortSignal;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.profile = params.profile;
    this.signal = params.signal;
  }
}
