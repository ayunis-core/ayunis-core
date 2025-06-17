import { RunInput } from '../../../domain/run-input.entity';
import { UUID } from 'crypto';

export class ExecuteRunCommand {
  threadId: UUID;

  // Agent ID - optional, if provided will use agent's model & merge tools & instructions
  agentId?: UUID;
  // input is separate from thread because tool results need to be
  // stored alongside results from tools collected by the run
  input: RunInput;
  userId: UUID;
  // Enable streaming mode for real-time responses
  streaming?: boolean;

  constructor(params: {
    threadId: UUID;
    agentId?: UUID;
    input: RunInput;
    userId: UUID;
    streaming?: boolean;
  }) {
    this.threadId = params.threadId;
    this.agentId = params.agentId;
    this.input = params.input;
    this.userId = params.userId;
    this.streaming = true;
  }
}
