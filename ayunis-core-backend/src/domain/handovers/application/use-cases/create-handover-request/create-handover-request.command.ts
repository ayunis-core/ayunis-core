import type { UUID } from 'crypto';
import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import type { HandoverTarget } from 'src/domain/handovers/domain/handover-target';

export class CreateHandoverRequestCommand {
  constructor(
    public readonly kind: HandoverResourceType,
    public readonly resourceId: UUID,
    public readonly target: HandoverTarget,
  ) {}
}
