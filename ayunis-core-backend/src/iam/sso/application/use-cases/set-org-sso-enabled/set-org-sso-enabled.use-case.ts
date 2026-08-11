import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';

@Injectable()
export class SetOrgSsoEnabledUseCase {
  private readonly logger = new Logger(SetOrgSsoEnabledUseCase.name);

  constructor(private readonly repository: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: SetOrgSsoEnabledCommand): Promise<OrgSsoConnection> {
    this.logger.log('Setting organization SSO state', {
      orgId: command.orgId,
      enabled: command.enabled,
    });
    const existing = await this.repository.findByOrgId(command.orgId);
    if (!existing) {
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    if (existing.enabled === command.enabled) {
      return existing;
    }
    if (command.enabled && !existing.zitadelOrgId) {
      throw new InvalidSsoConfigurationError('zitadelOrgId');
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
}
