import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { SetOrgSsoIdpCommand } from 'src/iam/sso/application/use-cases/set-org-sso-idp/set-org-sso-idp.command';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import { normalizeZitadelIdpId } from 'src/iam/sso/domain/sso-connection-values';

@Injectable()
export class SetOrgSsoIdpUseCase {
  private readonly logger = new Logger(SetOrgSsoIdpUseCase.name);

  constructor(private readonly repository: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: SetOrgSsoIdpCommand): Promise<OrgSsoConnection> {
    const zitadelIdpId = this.normalizeIdpId(command.zitadelIdpId);
    this.logger.log(
      { orgId: command.orgId, zitadelIdpId },
      'Setting organization SSO identity provider hint',
    );
    const existing = await this.repository.findByOrgId(command.orgId);
    if (!existing) {
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    if (existing.zitadelIdpId === zitadelIdpId) {
      return existing;
    }
    if (!existing.localPasswordLoginEnabled) {
      throw new InvalidSsoConfigurationError('localPasswordLoginEnabled');
    }

    // Conditional on the mapping that was just read, so a concurrent remap
    // cannot leave the hint pointing at a provider in another broker org.
    const updated = await this.repository.setZitadelIdpIdIfMappingMatches(
      existing,
      zitadelIdpId,
    );
    if (!updated) {
      const current = await this.repository.findByOrgId(command.orgId);
      if (current) {
        throw new SsoConnectionChangedError(command.orgId);
      }
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    return updated;
  }

  private normalizeIdpId(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    try {
      return normalizeZitadelIdpId(value);
    } catch (error: unknown) {
      if (error instanceof InvalidSsoConnectionValueError) {
        throw new InvalidSsoConfigurationError(error.field);
      }
      throw error;
    }
  }
}
