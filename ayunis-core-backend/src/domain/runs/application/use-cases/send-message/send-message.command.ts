import type { UUID } from 'crypto';
import type { RunInput } from 'src/domain/runs/domain/run-input.entity';

export class SendMessageCommand {
  public readonly threadId: UUID;
  public readonly input: RunInput;
  public readonly streaming: boolean;
  /**
   * True when the requesting org has no subscription and is consuming one
   * of its remaining trial messages. Decided at the HTTP boundary (from the
   * subscription guard's request context) so the application layer stays
   * transport-independent.
   */
  public readonly consumeTrialMessage: boolean;

  constructor(params: {
    threadId: UUID;
    input: RunInput;
    streaming: boolean;
    consumeTrialMessage: boolean;
  }) {
    this.threadId = params.threadId;
    this.input = params.input;
    this.streaming = params.streaming;
    this.consumeTrialMessage = params.consumeTrialMessage;
  }
}
