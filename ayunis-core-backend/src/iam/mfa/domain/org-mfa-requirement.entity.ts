import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface OrgMfaRequirementParams {
  id?: UUID;
  orgId: UUID;
  required?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Org-level MFA policy. When `required` is true, users of the org must
 * complete TOTP enrollment at their next login before receiving a session.
 * Absence of a row is equivalent to `required === false`.
 */
export class OrgMfaRequirement {
  id: UUID;
  orgId: UUID;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: OrgMfaRequirementParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.required = params.required ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
