import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { RunToolResultInput } from 'src/domain/runs/domain/run-input.entity';

export interface SeededInput {
  message: Message;
  masks: ThreadPiiMask[] | null;
}

export interface PreparedToolResultInput {
  input: RunToolResultInput;
  masks: ThreadPiiMask[] | null;
}
