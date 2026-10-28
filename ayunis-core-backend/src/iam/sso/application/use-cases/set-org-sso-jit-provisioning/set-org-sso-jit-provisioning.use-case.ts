import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';

@Injectable()
export class SetOrgSsoJitProvisioningUseCase {
  private readonly logger = new Logger(SetOrgSsoJitProvisioningUseCase.name);

  constructor(private readonly repository: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: SetOrgSsoJitProvisioningCommand,
  ): Promise<OrgSsoConnection> {
    this.logger.log(
      {
        orgId: command.orgId,
        enabled: command.enabled,
      },
      'Setting organization SSO JIT provisioning',
    );
    const existing = await this.repository.findByOrgId(command.orgId);
    if (!existing) {
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    if (existing.jitProvisioningEnabled === command.enabled) {
      return existing;
    }

    // Conditional on the mapping that was just read, so a concurrent remap
    // cannot have JIT flipped against an IdP the operator never saw.
    const updated =
      await this.repository.setJitProvisioningEnabledIfMappingMatches(
        existing,
        command.enabled,
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
}
