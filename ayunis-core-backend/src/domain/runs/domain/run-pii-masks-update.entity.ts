import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';

/**
 * Stream item carrying the thread's full mask dictionary. Yielded before any
 * message whose text contains freshly created `{{pii:...}}` tokens, so SSE
 * consumers can resolve them the moment the message arrives.
 */
export class RunPiiMasksUpdate {
  constructor(public readonly masks: ThreadPiiMask[]) {}
}

export type RunStreamItem = Message | RunPiiMasksUpdate;
