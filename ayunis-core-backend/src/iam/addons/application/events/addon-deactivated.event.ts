import type { UUID } from 'crypto';
import type { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

export class AddonDeactivatedEvent {
  static readonly EVENT_NAME = 'addon.deactivated';

  constructor(
    public readonly orgId: UUID,
    public readonly addonType: AddonType,
    public readonly actorUserId: UUID | null,
  ) {}
}
