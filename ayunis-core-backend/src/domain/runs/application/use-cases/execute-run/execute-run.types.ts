import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { UUID } from 'crypto';
import type {
  RunToolDecisionsInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';

/** Registers a message the run persisted, for cleanup if the run fails. */
export type OwnMessage = (messageId: UUID) => void;

export interface SeededInput {
  messages: Message[];
  masks: ThreadPiiMask[] | null;
}

export interface PreparedToolResultInput {
  input: RunToolResultInput | RunToolDecisionsInput;
  masks: ThreadPiiMask[] | null;
}
