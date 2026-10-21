import type { UUID } from 'crypto';
import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';

export class FindPendingHandoverQuery {
  constructor(
    public readonly kind: HandoverResourceType,
    public readonly resourceId: UUID,
  ) {}
}
