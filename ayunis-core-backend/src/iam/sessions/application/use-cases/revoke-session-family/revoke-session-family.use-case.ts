import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { sha256Hex } from 'src/common/util/sha256.util';
import { RevokeSessionFamilyCommand } from './revoke-session-family.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from '../../sessions.errors';

/**
 * Revokes the token family of the presented refresh token (logout). Idempotent
 * and tolerant of unknown/legacy tokens: an unrecognized token is a no-op, so
 * logout never fails.
 */
@Injectable()
export class RevokeSessionFamilyUseCase {
  private readonly logger = new Logger(RevokeSessionFamilyUseCase.name);

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeSessionFamilyCommand): Promise<void> {
    const token = await this.refreshTokensRepository.findByTokenHash(
      sha256Hex(command.refreshToken),
    );
    if (!token) {
      this.logger.debug('No session found for token; nothing to revoke');
      return;
    }
    await this.refreshTokensRepository.revokeFamily(token.familyId);
  }
}
