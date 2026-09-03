import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { StartAuthenticatedSessionCommand } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.command';
import {
  StartAuthenticatedSessionUseCase,
  type StartAuthenticatedSessionResult,
} from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { CompleteOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.command';
import { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import { CompleteSsoAuthenticationCommand } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.command';
import { LinkFederatedIdentityCommand } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.command';
import { LinkFederatedIdentityUseCase } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.use-case';
import { ProvisionOrgSsoUserCommand } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.command';
import { ProvisionOrgSsoUserUseCase } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import { InvalidSsoLoginTransactionError } from 'src/iam/sso/application/sso.errors';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { SsoBrokerSessionService } from 'src/iam/sso/application/services/sso-broker-session.service';

export interface SsoAuthenticationCompleted {
  kind: 'authenticated';
  redirectPath: string;
  session: StartAuthenticatedSessionResult;
}

export interface SsoAccountLinkCompleted {
  kind: 'linked';
  redirectPath: string;
}

export type CompleteSsoAuthenticationResult =
  SsoAuthenticationCompleted | SsoAccountLinkCompleted;

@Injectable()
export class CompleteSsoAuthenticationUseCase {
  private readonly logger = new Logger(CompleteSsoAuthenticationUseCase.name);

  constructor(
    private readonly completeOrgSsoLogin: CompleteOrgSsoLoginUseCase,
    private readonly provisionOrgSsoUser: ProvisionOrgSsoUserUseCase,
    private readonly startAuthenticatedSession: StartAuthenticatedSessionUseCase,
    private readonly linkFederatedIdentity: LinkFederatedIdentityUseCase,
    private readonly brokerSessions: SsoBrokerSessionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: CompleteSsoAuthenticationCommand,
  ): Promise<CompleteSsoAuthenticationResult> {
    this.logger.log(
      { hasBrowserBinding: command.browserBinding !== undefined },
      'Completing SSO authentication',
    );
    const login = await this.completeOrgSsoLogin.execute(
      new CompleteOrgSsoLoginCommand(
        command.callbackParameters,
        command.browserBinding,
      ),
    );
    if (login.purpose === SsoLoginPurpose.LINK) {
      if (!login.linkUserId) throw new InvalidSsoLoginTransactionError();
      await this.linkFederatedIdentity.execute(
        new LinkFederatedIdentityCommand(login.linkUserId, login.identity),
      );
      return { kind: 'linked', redirectPath: login.postLoginPath };
    }
    const user = await this.provisionOrgSsoUser.execute(
      new ProvisionOrgSsoUserCommand(login.identity),
    );
    if (login.identity.sessionId) {
      await this.storeBrokerLogoutHint(
        user.id,
        login.identity.sessionId,
        login.idToken,
      );
    }
    const session = await this.startAuthenticatedSession.execute(
      new StartAuthenticatedSessionCommand(
        this.toActiveUser(user),
        SessionAuthenticationMethod.SSO,
        login.identity.sessionId ?? null,
        login.identity.authenticationMethods.includes('mfa'),
      ),
    );
    return {
      kind: 'authenticated',
      redirectPath: this.redirectPath(login.postLoginPath, session),
      session,
    };
  }

  private async storeBrokerLogoutHint(
    userId: User['id'],
    zitadelSessionId: string,
    idToken: string,
  ): Promise<void> {
    try {
      await this.brokerSessions.store(userId, zitadelSessionId, idToken);
    } catch (error) {
      this.logger.warn(
        { failureType: error instanceof Error ? error.name : typeof error },
        'Broker logout hint could not be stored; interactive logout remains available',
      );
    }
  }

  private redirectPath(
    postLoginPath: string,
    session: StartAuthenticatedSessionResult,
  ): string {
    if (session.status === 'authenticated') return postLoginPath;
    const query = new URLSearchParams({ redirect: postLoginPath });
    if (session.enrollmentRequired) query.set('enroll', 'true');
    return `/two-factor?${query.toString()}`;
  }

  private toActiveUser(user: User): ActiveUser {
    return new ActiveUser({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      systemRole: user.systemRole,
      orgId: user.orgId,
      name: user.name,
    });
  }
}
