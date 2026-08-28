import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RevokeSessionFamilyCommand } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.command';
import { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { CompleteSsoLogoutCommand } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.command';
import { SsoBrokerSessionService } from 'src/iam/sso/application/services/sso-broker-session.service';

export interface CompleteSsoLogoutResult {
  brokerLogoutUrl: string | null;
}

@Injectable()
export class CompleteSsoLogoutUseCase {
  constructor(
    @InjectPinoLogger(CompleteSsoLogoutUseCase.name)
    private readonly logger: PinoLogger,
    private readonly revokeSessionFamily: RevokeSessionFamilyUseCase,
    private readonly broker: OidcBrokerLogoutClient,
    private readonly brokerSessions: SsoBrokerSessionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: CompleteSsoLogoutCommand,
  ): Promise<CompleteSsoLogoutResult> {
    this.logger.info('Completing Core logout');
    if (!command.refreshToken) return { brokerLogoutUrl: null };
    const session = await this.revokeSessionFamily.execute(
      new RevokeSessionFamilyCommand(command.refreshToken),
    );
    if (session?.authenticationMethod !== SessionAuthenticationMethod.SSO) {
      return { brokerLogoutUrl: null };
    }
    const idTokenHint = await this.idTokenHintFor(session.zitadelSessionId);
    return { brokerLogoutUrl: this.broker.createEndSessionUrl(idTokenHint) };
  }

  private async idTokenHintFor(
    zitadelSessionId: string | null,
  ): Promise<string | undefined> {
    if (!zitadelSessionId) return undefined;
    try {
      return await this.brokerSessions.idTokenFor(zitadelSessionId);
    } catch (error) {
      this.logger.warn(
        { failureType: error instanceof Error ? error.name : typeof error },
        'Stored broker logout hint unavailable; using interactive fallback',
      );
      return undefined;
    }
  }
}
