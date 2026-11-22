import type { UUID } from 'crypto';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';

export class AllocateThreadPiiMasksCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly values: Pick<PiiMask, 'category' | 'value'>[],
  ) {}
}
