import type { UUID } from 'crypto';
import type { AddonType } from '../../../domain/value-objects/addon-type.enum';

export class DeactivateAddonCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly type: AddonType,
    public readonly requestingUserId: UUID,
  ) {}
}
