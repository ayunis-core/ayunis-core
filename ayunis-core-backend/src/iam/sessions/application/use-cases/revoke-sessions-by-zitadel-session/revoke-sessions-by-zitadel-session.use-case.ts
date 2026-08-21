import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import { RevokeSessionsByZitadelSessionCommand } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.command';

@Injectable()
export class RevokeSessionsByZitadelSessionUseCase {
  constructor(
    @InjectPinoLogger(RevokeSessionsByZitadelSessionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeSessionsByZitadelSessionCommand): Promise<void> {
    this.logger.info('Revoking sessions for broker session');
    await this.refreshTokens.revokeByZitadelSessionId(command.zitadelSessionId);
  }
}
