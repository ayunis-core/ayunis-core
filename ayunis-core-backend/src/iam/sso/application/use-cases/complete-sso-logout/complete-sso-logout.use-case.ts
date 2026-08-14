import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RevokeSessionFamilyCommand } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.command';
import { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { CompleteSsoLogoutCommand } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.command';

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
    return { brokerLogoutUrl: this.broker.createEndSessionUrl() };
  }
}
