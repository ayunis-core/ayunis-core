import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  normalizeEmailDomain,
  normalizeZitadelIdpId,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';

export interface OrgSsoConnectionParams {
  id?: UUID;
  orgId: UUID;
  emailDomain: string;
  domainVerifiedAt: Date;
  zitadelOrgId: string | null;
  zitadelIdpId?: string | null;
  enabled?: boolean;
  jitProvisioningEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrgSsoConnection {
  id: UUID;
  orgId: UUID;
  emailDomain: string;
  domainVerifiedAt: Date;
  zitadelOrgId: string | null;
  // Optional IdP hint. When set, the broker skips its own login page and
  // redirects straight to the customer's provider.
  zitadelIdpId: string | null;
  enabled: boolean;
  jitProvisioningEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: OrgSsoConnectionParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.emailDomain = normalizeEmailDomain(params.emailDomain);
    this.domainVerifiedAt = params.domainVerifiedAt;
    this.zitadelOrgId =
      params.zitadelOrgId === null
        ? null
        : normalizeZitadelOrgId(params.zitadelOrgId);
    this.zitadelIdpId =
      params.zitadelIdpId === null || params.zitadelIdpId === undefined
        ? null
        : normalizeZitadelIdpId(params.zitadelIdpId);
    this.enabled = params.enabled ?? false;
    this.jitProvisioningEnabled = params.jitProvisioningEnabled ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
