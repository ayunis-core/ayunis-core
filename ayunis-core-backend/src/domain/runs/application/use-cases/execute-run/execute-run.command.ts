import { RunInput } from '../../../domain/run-input.entity';
import { UUID } from 'crypto';

export class ExecuteRunCommand {
  threadId: UUID;
  // input is separate from thread because tool results need to be
  // stored alongside results from tools collected by the run
  input: RunInput;
  // Enable streaming mode for real-time responses
  streaming?: boolean;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    streaming?: boolean;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.streaming = true;
  }
}
