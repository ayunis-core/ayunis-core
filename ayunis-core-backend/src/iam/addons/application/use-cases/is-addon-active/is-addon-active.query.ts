import type { UUID } from 'crypto';
import type { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

export class IsAddonActiveQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly type: AddonType,
  ) {}
}
