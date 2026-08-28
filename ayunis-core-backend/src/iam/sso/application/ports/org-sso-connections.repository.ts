import type { UUID } from 'crypto';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

export type SsoConnectionUniqueField =
  'orgId' | 'emailDomains' | 'zitadelOrgId';

export interface OrgSsoConnectionDomainState {
  connection: OrgSsoConnection;
  hasCanonicalEmailDomains: boolean;
}

export class SsoConnectionUniqueConstraintError extends Error {
  constructor(public readonly field: SsoConnectionUniqueField) {
    super(`SSO connection unique constraint violated: ${field}`);
    this.name = SsoConnectionUniqueConstraintError.name;
  }
}

export abstract class OrgSsoConnectionsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgSsoConnection | null>;
  abstract findByOrgIdWithDomainState(
    orgId: UUID,
  ): Promise<OrgSsoConnectionDomainState | null>;
  abstract findByEmailDomain(
    emailDomain: string,
  ): Promise<OrgSsoConnection | null>;
  abstract findOwnerOrgIdsByEmailDomains(
    emailDomains: string[],
  ): Promise<UUID[]>;
  abstract save(connection: OrgSsoConnection): Promise<OrgSsoConnection>;
  abstract updateConfigurationIfDisabled(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null>;
  abstract setEnabled(
    connection: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null>;
  abstract setJitProvisioningEnabledIfMappingMatches(
    expected: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null>;
  abstract setZitadelIdpIdIfMappingMatches(
    expected: OrgSsoConnection,
    zitadelIdpId: string | null,
  ): Promise<OrgSsoConnection | null>;
}
