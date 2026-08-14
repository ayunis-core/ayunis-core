import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import { RevokeSessionsByZitadelSessionCommand } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.command';

@Injectable()
export class RevokeSessionsByZitadelSessionUseCase {
  private readonly logger = new Logger(
    RevokeSessionsByZitadelSessionUseCase.name,
  );

  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeSessionsByZitadelSessionCommand): Promise<void> {
    this.logger.log('Revoking sessions for broker session');
    await this.refreshTokens.revokeByZitadelSessionId(command.zitadelSessionId);
  }
}
