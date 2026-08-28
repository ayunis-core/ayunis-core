import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import { normalizeZitadelOrgId } from 'src/iam/sso/domain/sso-connection-values';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';

@Injectable()
export class SetOrgSsoEnabledUseCase {
  constructor(
    @InjectPinoLogger(SetOrgSsoEnabledUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: OrgSsoConnectionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: SetOrgSsoEnabledCommand): Promise<OrgSsoConnection> {
    this.logger.info(
      {
        orgId: command.orgId,
        enabled: command.enabled,
      },
      'Setting organization SSO state',
    );
    const existingState = await this.repository.findByOrgIdWithDomainState(
      command.orgId,
    );
    if (!existingState) {
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    const existing = existingState.connection;
    if (!this.matchesReviewedMapping(existing, command.reviewedMapping)) {
      throw new SsoConnectionChangedError(command.orgId);
    }
    if (command.enabled && !existing.zitadelOrgId) {
      throw new InvalidSsoConfigurationError('zitadelOrgId');
    }
    if (command.enabled && !existingState.hasCanonicalEmailDomains) {
      throw new InvalidSsoConfigurationError('emailDomains');
    }
    if (existing.enabled === command.enabled) {
      return existing;
    }

    const updated = await this.repository.setEnabled(existing, command.enabled);
    if (!updated) {
      const current = await this.repository.findByOrgId(command.orgId);
      if (current) {
        throw new SsoConnectionChangedError(command.orgId);
      }
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    return updated;
  }

  private matchesReviewedMapping(
    existing: OrgSsoConnection,
    reviewed: SetOrgSsoEnabledCommand['reviewedMapping'],
  ): boolean {
    if (!reviewed) return true;
    try {
      return (
        existing.matchesEmailDomains(reviewed.emailDomains) &&
        normalizeZitadelOrgId(reviewed.zitadelOrgId) === existing.zitadelOrgId
      );
    } catch (error: unknown) {
      if (error instanceof InvalidSsoConnectionValueError) {
        throw new InvalidSsoConfigurationError(error.field);
      }
      throw error;
    }
  }
}
