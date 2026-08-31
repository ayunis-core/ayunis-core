import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { sha256Hex } from 'src/common/util/sha256.util';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import {
  RefreshTokenExpiredError,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
  UnexpectedSessionsError,
} from 'src/iam/sessions/application/sessions.errors';
import { PrepareSessionRotationCommand } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.command';
import type { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';

@Injectable()
export class PrepareSessionRotationUseCase {
  private readonly logger = new Logger(PrepareSessionRotationUseCase.name);

  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: PrepareSessionRotationCommand): Promise<RefreshToken> {
    const current = await this.refreshTokens.findByTokenHash(
      sha256Hex(command.refreshToken),
    );
    if (!current) throw new RefreshTokenNotFoundError();
    if (current.isRevoked()) {
      await this.refreshTokens.revokeFamily(current.familyId);
      this.logger.warn(
        { userId: current.userId, familyId: current.familyId },
        'Refresh token reuse detected (revoked token)',
      );
      throw new RefreshTokenReuseError();
    }
    if (current.isExpired()) throw new RefreshTokenExpiredError();
    return current;
  }
}
