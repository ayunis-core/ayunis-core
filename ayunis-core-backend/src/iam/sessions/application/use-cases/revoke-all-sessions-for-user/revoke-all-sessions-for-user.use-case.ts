import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(RevokeAllSessionsForUserUseCase.name);

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeAllSessionsForUserCommand): Promise<void> {
    this.logger.log('revokeAllSessionsForUser', { userId: command.userId });
    await this.refreshTokensRepository.revokeAllForUser(command.userId);
  }
}
