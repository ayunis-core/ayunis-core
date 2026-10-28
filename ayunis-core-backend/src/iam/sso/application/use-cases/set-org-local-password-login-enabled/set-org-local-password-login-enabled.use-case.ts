import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
  SsoDomainAccountConflictError,
} from 'src/iam/sso/application/sso.errors';
import { SetOrgLocalPasswordLoginEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-local-password-login-enabled/set-org-local-password-login-enabled.command';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { RevokePasswordSessionsForOrgCommand } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.command';
import { RevokePasswordSessionsForOrgUseCase } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.use-case';
import { HasUsersOutsideOrgWithEmailDomainsUseCase } from 'src/iam/users/application/use-cases/has-users-outside-org-with-email-domains/has-users-outside-org-with-email-domains.use-case';
import { HasUsersOutsideOrgWithEmailDomainsQuery } from 'src/iam/users/application/use-cases/has-users-outside-org-with-email-domains/has-users-outside-org-with-email-domains.query';

export interface SetOrgLocalPasswordLoginEnabledResult {
  connection: OrgSsoConnection;
  previousLocalPasswordLoginEnabled: boolean;
}

@Injectable()
export class SetOrgLocalPasswordLoginEnabledUseCase {
  private readonly logger = new Logger(
    SetOrgLocalPasswordLoginEnabledUseCase.name,
  );

  constructor(
    private readonly repository: OrgSsoConnectionsRepository,
    private readonly revokePasswordSessions: RevokePasswordSessionsForOrgUseCase,
    private readonly domainAccounts: HasUsersOutsideOrgWithEmailDomainsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  @Transactional()
  async execute(
    command: SetOrgLocalPasswordLoginEnabledCommand,
  ): Promise<SetOrgLocalPasswordLoginEnabledResult> {
    this.logger.log(
      { orgId: command.orgId, enabled: command.enabled },
      'Setting organization local password login state',
    );
    const state = await this.repository.findByOrgIdWithDomainState(
      command.orgId,
    );
    if (!state) throw new SsoConnectionNotFoundError(command.orgId);
    const existing = state.connection;
    await this.assertCanDisable(
      command,
      existing,
      state.hasCanonicalEmailDomains,
    );
    if (existing.localPasswordLoginEnabled === command.enabled) {
      return {
        connection: existing,
        previousLocalPasswordLoginEnabled: existing.localPasswordLoginEnabled,
      };
    }
    const updated =
      await this.repository.setLocalPasswordLoginEnabledIfMappingMatches(
        existing,
        command.enabled,
      );
    if (updated) {
      if (!command.enabled) {
        await this.revokePasswordSessions.execute(
          new RevokePasswordSessionsForOrgCommand(command.orgId),
        );
      }
      return {
        connection: updated,
        previousLocalPasswordLoginEnabled: existing.localPasswordLoginEnabled,
      };
    }
    return this.concurrentChange(command.orgId);
  }

  private async assertCanDisable(
    command: SetOrgLocalPasswordLoginEnabledCommand,
    connection: OrgSsoConnection,
    hasCanonicalEmailDomains: boolean,
  ): Promise<void> {
    if (command.enabled) return;
    if (!connection.enabled || !connection.zitadelOrgId) {
      throw new InvalidSsoConfigurationError('enabled');
    }
    if (!hasCanonicalEmailDomains) {
      throw new InvalidSsoConfigurationError('emailDomains');
    }
    if (command.reviewedMapping?.zitadelIdpId === undefined) {
      throw new InvalidSsoConfigurationError('confirmation');
    }
    if (!command.reviewedMapping.matches(connection)) {
      throw new SsoConnectionChangedError(command.orgId);
    }
    if (
      connection.localPasswordLoginEnabled &&
      (await this.domainAccounts.execute(
        new HasUsersOutsideOrgWithEmailDomainsQuery(
          command.orgId,
          connection.emailDomains.map(({ emailDomain }) => emailDomain),
        ),
      ))
    )
      throw new SsoDomainAccountConflictError(command.orgId);
  }

  private async concurrentChange(
    orgId: SetOrgLocalPasswordLoginEnabledCommand['orgId'],
  ): Promise<never> {
    const current = await this.repository.findByOrgId(orgId);
    if (current) throw new SsoConnectionChangedError(orgId);
    throw new SsoConnectionNotFoundError(orgId);
  }
}
