import type { UUID } from 'crypto';
import type { AddonType } from '../../domain/value-objects/addon-type.enum';

export class AddonActivatedEvent {
  static readonly EVENT_NAME = 'addon.activated';

  constructor(
    public readonly orgId: UUID,
    public readonly addonType: AddonType,
    public readonly actorUserId: UUID,
  ) {}
}
