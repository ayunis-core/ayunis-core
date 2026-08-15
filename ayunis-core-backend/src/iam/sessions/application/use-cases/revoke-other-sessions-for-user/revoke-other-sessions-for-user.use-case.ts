import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { sha256Hex } from 'src/common/util/sha256.util';
import { RevokeOtherSessionsForUserCommand } from './revoke-other-sessions-for-user.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from '../../sessions.errors';

/**
 * Revokes every session for a user except the one presented (the actor's
 * current device). Used on self-service password change so the actor stays
 * logged in while all other devices are logged out. Falls back to revoking all
 * sessions when the current token cannot be resolved (e.g. a legacy JWT cookie).
 */
@Injectable()
export class RevokeOtherSessionsForUserUseCase {
  constructor(
    @InjectPinoLogger(RevokeOtherSessionsForUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeOtherSessionsForUserCommand): Promise<void> {
    this.logger.info({ userId: command.userId }, 'revokeOtherSessionsForUser');

    const current = command.currentRefreshToken
      ? await this.refreshTokensRepository.findByTokenHash(
          sha256Hex(command.currentRefreshToken),
        )
      : null;

    if (current?.userId === command.userId) {
      await this.refreshTokensRepository.revokeAllForUserExceptFamily(
        command.userId,
        current.familyId,
      );
      return;
    }

    await this.refreshTokensRepository.revokeAllForUser(command.userId);
  }
}
