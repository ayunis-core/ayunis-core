import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RevokeAllSessionsForUserCommand } from './revoke-all-sessions-for-user.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from '../../sessions.errors';

/**
 * Revokes every active session for a user. Called after a password change or
 * reset so all other devices are logged out.
 */
@Injectable()
export class RevokeAllSessionsForUserUseCase {
  constructor(
    @InjectPinoLogger(RevokeAllSessionsForUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeAllSessionsForUserCommand): Promise<void> {
    this.logger.info({ userId: command.userId }, 'revokeAllSessionsForUser');
    await this.refreshTokensRepository.revokeAllForUser(command.userId);
  }
}
