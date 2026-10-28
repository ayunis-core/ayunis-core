import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import { RevokeSsoSessionsForUserCommand } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.command';

@Injectable()
export class RevokeSsoSessionsForUserUseCase {
  private readonly logger = new Logger(RevokeSsoSessionsForUserUseCase.name);

  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeSsoSessionsForUserCommand): Promise<void> {
    this.logger.log(
      { userId: command.userId },
      'Revoking SSO sessions for user',
    );
    await this.refreshTokens.revokeSsoForUser(command.userId);
  }
}
