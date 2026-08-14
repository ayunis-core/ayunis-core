import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import { RevokeSsoSessionsForUserCommand } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.command';

@Injectable()
export class RevokeSsoSessionsForUserUseCase {
  constructor(
    @InjectPinoLogger(RevokeSsoSessionsForUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeSsoSessionsForUserCommand): Promise<void> {
    this.logger.info(
      { userId: command.userId },
      'Revoking SSO sessions for user',
    );
    await this.refreshTokens.revokeSsoForUser(command.userId);
  }
}
