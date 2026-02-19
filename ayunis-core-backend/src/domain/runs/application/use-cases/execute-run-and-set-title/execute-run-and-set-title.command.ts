import type { UUID } from 'crypto';
import type { RunInput } from 'src/domain/runs/domain/run-input.entity';

export class ExecuteRunAndSetTitleCommand {
  public readonly threadId: UUID;
  public readonly input: RunInput;
  public readonly streaming?: boolean;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    streaming?: boolean;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.streaming = params.streaming;
  }
}
