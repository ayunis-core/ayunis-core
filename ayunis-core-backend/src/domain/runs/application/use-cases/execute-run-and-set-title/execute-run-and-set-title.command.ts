import { UUID } from 'crypto';
import { RunInput } from 'src/domain/runs/domain/run-input.entity';

export class ExecuteRunAndSetTitleCommand {
  public readonly threadId: UUID;
  public readonly input: RunInput;
  public readonly userId: UUID;
  public readonly streaming?: boolean;
  public readonly orgId: UUID;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    userId: UUID;
    streaming?: boolean;
    orgId: UUID;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.userId = params.userId;
    this.streaming = params.streaming;
    this.orgId = params.orgId;
  }
}
