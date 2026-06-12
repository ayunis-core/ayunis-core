import type { UUID } from 'crypto';
import type { OrgAddon } from '../../domain/org-addon.entity';
import type { AddonType } from '../../domain/value-objects/addon-type.enum';

export abstract class OrgAddonRepository {
  abstract findAllByOrgId(orgId: UUID): Promise<OrgAddon[]>;
  abstract findByOrgAndType(
    orgId: UUID,
    type: AddonType,
  ): Promise<OrgAddon | null>;
  abstract create(addon: OrgAddon): Promise<OrgAddon>;
  abstract delete(id: UUID): Promise<void>;
}
