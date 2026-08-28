import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  normalizeEmailDomain,
  normalizeEmailDomains,
  normalizeZitadelIdpId,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';

export interface OrgSsoConnectionParams {
  id?: UUID;
  orgId: UUID;
  emailDomains?: SsoEmailDomain[];
  emailDomain?: string;
  domainVerifiedAt?: Date;
  zitadelOrgId: string | null;
  zitadelIdpId?: string | null;
  enabled?: boolean;
  jitProvisioningEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SsoEmailDomain {
  emailDomain: string;
  verifiedAt: Date;
}

export class OrgSsoConnection {
  id: UUID;
  orgId: UUID;
  emailDomains: SsoEmailDomain[];
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
    this.emailDomains = this.normalizeEmailDomains(params);
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

  get emailDomain(): string {
    return this.emailDomains[0].emailDomain;
  }

  get domainVerifiedAt(): Date {
    return this.emailDomains[0].verifiedAt;
  }

  hasEmailDomain(value: string): boolean {
    const normalized = normalizeEmailDomain(value);
    return this.emailDomains.some(
      ({ emailDomain }) => emailDomain === normalized,
    );
  }

  matchesEmailDomains(values: string[]): boolean {
    const normalized = normalizeEmailDomains(values);
    return (
      this.emailDomains.length === normalized.length &&
      this.emailDomains.every(
        ({ emailDomain }, index) => emailDomain === normalized[index],
      )
    );
  }

  private normalizeEmailDomains(
    params: OrgSsoConnectionParams,
  ): SsoEmailDomain[] {
    const domains =
      params.emailDomains ??
      (params.emailDomain && params.domainVerifiedAt
        ? [
            {
              emailDomain: params.emailDomain,
              verifiedAt: params.domainVerifiedAt,
            },
          ]
        : []);
    const normalizedValues = normalizeEmailDomains(
      domains.map(({ emailDomain }) => emailDomain),
    );
    const verifiedAtByDomain = new Map(
      domains.map(({ emailDomain, verifiedAt }) => [
        normalizeEmailDomain(emailDomain),
        verifiedAt,
      ]),
    );
    return normalizedValues.map((emailDomain) => ({
      emailDomain,
      verifiedAt: verifiedAtByDomain.get(emailDomain) as Date,
    }));
  }
}
