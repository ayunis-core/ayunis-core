import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RevokeSessionsByZitadelSessionCommand } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.command';
import { RevokeSessionsByZitadelSessionUseCase } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.use-case';
import { RevokeSsoSessionsForUserCommand } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.command';
import { RevokeSsoSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.use-case';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import {
  InvalidSsoLogoutTokenError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { HandleSsoBackchannelLogoutCommand } from 'src/iam/sso/application/use-cases/handle-sso-backchannel-logout/handle-sso-backchannel-logout.command';

@Injectable()
export class HandleSsoBackchannelLogoutUseCase {
  private readonly logger = new Logger(HandleSsoBackchannelLogoutUseCase.name);

  constructor(
    private readonly broker: OidcBrokerLogoutClient,
    private readonly identities: FederatedIdentitiesRepository,
    private readonly revokeBySession: RevokeSessionsByZitadelSessionUseCase,
    private readonly revokeForUser: RevokeSsoSessionsForUserUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: HandleSsoBackchannelLogoutCommand): Promise<void> {
    this.logger.log('Handling SSO back-channel logout');
    const logout = await this.broker.validateBackchannelLogoutToken(
      command.logoutToken,
    );
    if (logout.sessionId) {
      await this.revokeBySession.execute(
        new RevokeSessionsByZitadelSessionCommand(logout.sessionId),
      );
      return;
    }
    if (!logout.subject) throw new InvalidSsoLogoutTokenError();
    const identity = await this.identities.findByIssuerAndSubject(
      logout.issuer,
      logout.subject,
    );
    if (!identity) return;
    await this.revokeForUser.execute(
      new RevokeSsoSessionsForUserCommand(identity.userId),
    );
  }
}
