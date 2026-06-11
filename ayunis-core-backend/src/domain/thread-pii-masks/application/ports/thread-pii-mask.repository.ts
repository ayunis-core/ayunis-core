import type { UUID } from 'crypto';
import type { ThreadPiiMask } from '../../domain/thread-pii-mask.entity';

export abstract class ThreadPiiMaskRepository {
  abstract findByThreadId(threadId: UUID): Promise<ThreadPiiMask[]>;
  abstract saveMany(masks: ThreadPiiMask[]): Promise<void>;
}
