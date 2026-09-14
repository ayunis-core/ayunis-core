import { Transactional } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  SsoMustRemainEnabledError,
  SsoPasswordlessUsersExistError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import type { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { HasPasswordlessUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/has-passwordless-users-by-org-id/has-passwordless-users-by-org-id.query';
import { HasPasswordlessUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/has-passwordless-users-by-org-id/has-passwordless-users-by-org-id.use-case';

type ExistingState = NonNullable<
  Awaited<ReturnType<OrgSsoConnectionsRepository['findByOrgIdWithDomainState']>>
>;

function assertCanSetSsoState(
  command: SetOrgSsoEnabledCommand,
  state: ExistingState,
): void {
  const connection = state.connection;
  if (!command.enabled && !connection.localPasswordLoginEnabled) {
    throw new SsoMustRemainEnabledError(command.orgId);
  }
  if (command.reviewedMapping && !command.reviewedMapping.matches(connection)) {
    throw new SsoConnectionChangedError(command.orgId);
  }
  if (command.enabled && !connection.zitadelOrgId) {
    throw new InvalidSsoConfigurationError('zitadelOrgId');
  }
  if (command.enabled && !state.hasCanonicalEmailDomains) {
    throw new InvalidSsoConfigurationError('emailDomains');
  }
}

@Injectable()
export class SetOrgSsoEnabledUseCase {
  private readonly logger = new Logger(SetOrgSsoEnabledUseCase.name);

  constructor(
    private readonly repository: OrgSsoConnectionsRepository,
    private readonly hasPasswordlessUsers: HasPasswordlessUsersByOrgIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  @Transactional()
  async execute(command: SetOrgSsoEnabledCommand): Promise<OrgSsoConnection> {
    this.logger.log(
      {
        orgId: command.orgId,
        enabled: command.enabled,
      },
      'Setting organization SSO state',
    );
    const locked = await this.repository.acquireMutationLock(command.orgId);
    if (!locked) throw new SsoConnectionNotFoundError(command.orgId);
    const existingState = await this.repository.findByOrgIdWithDomainState(
      command.orgId,
    );
    if (!existingState) {
      throw new SsoConnectionNotFoundError(command.orgId);
    }
    const existing = existingState.connection;
    assertCanSetSsoState(command, existingState);
    if (existing.enabled === command.enabled) {
      return existing;
    }
    if (
      !command.enabled &&
      (await this.hasPasswordlessUsers.execute(
        new HasPasswordlessUsersByOrgIdQuery(command.orgId),
      ))
    ) {
      throw new SsoPasswordlessUsersExistError(command.orgId);
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
