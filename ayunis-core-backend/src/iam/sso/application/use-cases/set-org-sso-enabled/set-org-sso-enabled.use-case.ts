import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import type { ReviewedSsoMapping } from 'src/iam/sso/application/models/reviewed-sso-mapping';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

@Injectable()
export class SetOrgSsoEnabledUseCase {
  private readonly logger = new Logger(SetOrgSsoEnabledUseCase.name);

  constructor(private readonly repository: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: SetOrgSsoEnabledCommand): Promise<OrgSsoConnection> {
    this.logger.log(
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
    this.assertReviewedMappingMatches(
      existing,
      command.reviewedMapping,
      command.orgId,
    );
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

  private assertReviewedMappingMatches(
    connection: OrgSsoConnection,
    reviewedMapping: ReviewedSsoMapping | undefined,
    orgId: SetOrgSsoEnabledCommand['orgId'],
  ): void {
    if (reviewedMapping && !reviewedMapping.matches(connection)) {
      throw new SsoConnectionChangedError(orgId);
    }
  }
}
