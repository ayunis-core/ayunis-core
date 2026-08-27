import type { UUID } from 'crypto';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

export type SsoConnectionUniqueField = 'orgId' | 'emailDomain' | 'zitadelOrgId';

export class SsoConnectionUniqueConstraintError extends Error {
  constructor(public readonly field: SsoConnectionUniqueField) {
    super(`SSO connection unique constraint violated: ${field}`);
    this.name = SsoConnectionUniqueConstraintError.name;
  }
}

export abstract class OrgSsoConnectionsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgSsoConnection | null>;
  abstract findByEmailDomain(
    emailDomain: string,
  ): Promise<OrgSsoConnection | null>;
  abstract findByZitadelOrgId(
    zitadelOrgId: string,
  ): Promise<OrgSsoConnection | null>;
  abstract save(connection: OrgSsoConnection): Promise<OrgSsoConnection>;
  abstract updateConfigurationIfDisabled(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null>;
  abstract setEnabled(
    connection: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null>;
  abstract setJitProvisioningEnabled(
    orgId: UUID,
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
