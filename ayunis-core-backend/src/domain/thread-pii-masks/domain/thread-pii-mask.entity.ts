import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import { formatPiiToken } from 'src/common/anonymization/domain/pii-mask';

export interface ThreadPiiMaskParams {
  id?: UUID;
  threadId: UUID;
  category: PiiCategory;
  maskIndex: number;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * One entry of a thread's mask dictionary: the original PII value behind a
 * stable `{{pii:CATEGORY_n}}` token. The token is what the LLM sees and what
 * is persisted in message text; the value is only ever shown to thread
 * participants in the frontend.
 */
export class ThreadPiiMask {
  id: UUID;
  threadId: UUID;
  category: PiiCategory;
  maskIndex: number;
  value: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: ThreadPiiMaskParams) {
    this.id = params.id ?? randomUUID();
    this.threadId = params.threadId;
    this.category = params.category;
    this.maskIndex = params.maskIndex;
    this.value = params.value;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get token(): string {
    return formatPiiToken(this);
  }

  toPiiMask(): PiiMask {
    return {
      category: this.category,
      maskIndex: this.maskIndex,
      value: this.value,
    };
  }

  static fromPiiMask(threadId: UUID, mask: PiiMask): ThreadPiiMask {
    return new ThreadPiiMask({
      threadId,
      category: mask.category,
      maskIndex: mask.maskIndex,
      value: mask.value,
    });
  }
}
