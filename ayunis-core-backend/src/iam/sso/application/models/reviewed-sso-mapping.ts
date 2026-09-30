import { InvalidSsoConfigurationError } from 'src/iam/sso/application/sso.errors';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import {
  normalizeZitadelIdpId,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';

export class ReviewedSsoMapping {
  constructor(
    public readonly emailDomains: string[],
    public readonly zitadelOrgId: string,
    public readonly zitadelIdpId?: string | null,
  ) {}

  matches(connection: OrgSsoConnection): boolean {
    try {
      return (
        connection.matchesEmailDomains(this.emailDomains) &&
        normalizeZitadelOrgId(this.zitadelOrgId) === connection.zitadelOrgId &&
        this.matchesIdp(connection)
      );
    } catch (error: unknown) {
      if (error instanceof InvalidSsoConnectionValueError) {
        throw new InvalidSsoConfigurationError(error.field);
      }
      throw error;
    }
  }

  private matchesIdp(connection: OrgSsoConnection): boolean {
    if (this.zitadelIdpId === undefined) return true;
    if (this.zitadelIdpId === null) return connection.zitadelIdpId === null;
    return normalizeZitadelIdpId(this.zitadelIdpId) === connection.zitadelIdpId;
  }
}
