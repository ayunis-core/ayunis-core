import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { AddonType } from './value-objects/addon-type.enum';

export interface OrgAddonParams {
  id?: UUID;
  orgId: UUID;
  type: AddonType;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Marks an add-on as active for an organization. An add-on is active while
 * a row exists for the (org, type) pair; deactivation deletes the row.
 */
export class OrgAddon {
  id: UUID;
  orgId: UUID;
  type: AddonType;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: OrgAddonParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.type = params.type;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
