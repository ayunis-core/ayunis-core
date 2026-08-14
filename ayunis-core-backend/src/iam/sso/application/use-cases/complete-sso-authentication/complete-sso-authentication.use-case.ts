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

export interface SsoAuthenticationCompleted {
  kind: 'authenticated';
  postLoginPath: string;
  session: StartAuthenticatedSessionResult;
}

export interface SsoAccountLinkCompleted {
  kind: 'linked';
  postLoginPath: string;
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
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: CompleteSsoAuthenticationCommand,
  ): Promise<CompleteSsoAuthenticationResult> {
    this.logger.log('Completing SSO authentication', {
      hasBrowserBinding: command.browserBinding !== undefined,
    });
    const login = await this.completeOrgSsoLogin.execute(
      new CompleteOrgSsoLoginCommand(
        command.callbackParameters,
        command.browserBinding,
      ),
    );
    if (login.purpose === SsoLoginPurpose.LINK) {
      if (!login.linkUserId) throw new InvalidSsoLoginTransactionError();
      await this.linkFederatedIdentity.execute(
        new LinkFederatedIdentityCommand(login.linkUserId, login),
      );
      return { kind: 'linked', postLoginPath: login.postLoginPath };
    }
    const user = await this.provisionOrgSsoUser.execute(
      new ProvisionOrgSsoUserCommand(login),
    );
    const session = await this.startAuthenticatedSession.execute(
      new StartAuthenticatedSessionCommand(
        this.toActiveUser(user),
        SessionAuthenticationMethod.SSO,
        login.sessionId ?? null,
        login.authenticationMethods.includes('mfa'),
      ),
    );
    return {
      kind: 'authenticated',
      postLoginPath: login.postLoginPath,
      session,
    };
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
