import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { sha256Hex } from 'src/common/util/sha256.util';
import { RotateSessionCommand } from './rotate-session.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { RefreshTokenFactory } from '../../services/refresh-token.factory';
import { RefreshToken } from '../../../domain/refresh-token.entity';
import {
  RefreshTokenExpiredError,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
  UnexpectedSessionsError,
} from '../../sessions.errors';

export interface RotateSessionResult {
  userId: UUID;
  refreshToken: string;
}

@Injectable()
export class RotateSessionUseCase {
  private readonly logger = new Logger(RotateSessionUseCase.name);

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly refreshTokenFactory: RefreshTokenFactory,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RotateSessionCommand): Promise<RotateSessionResult> {
    const current = await this.refreshTokensRepository.findByTokenHash(
      sha256Hex(command.refreshToken),
    );

    if (!current) {
      throw new RefreshTokenNotFoundError();
    }
    if (current.isRevoked()) {
      // Presenting a revoked token means the family is compromised.
      await this.refreshTokensRepository.revokeFamily(current.familyId);
      this.logger.warn('Refresh token reuse detected (revoked token)', {
        userId: current.userId,
        familyId: current.familyId,
      });
      throw new RefreshTokenReuseError();
    }
    if (current.isExpired()) {
      throw new RefreshTokenExpiredError();
    }

    return this.rotate(current);
  }

  private async rotate(current: RefreshToken): Promise<RotateSessionResult> {
    const { token: successor, plaintext } = this.refreshTokenFactory.create({
      userId: current.userId,
      familyId: current.familyId,
    });

    const won = await this.refreshTokensRepository.markUsedAndInsertSuccessor(
      current.id,
      successor,
    );
    if (won) {
      return { userId: current.userId, refreshToken: plaintext };
    }

    // Lost the atomic rotation: either a concurrent request already rotated
    // this token (benign race, within grace) or it is a post-grace replay
    // (theft).
    const withinGrace = await this.refreshTokensRepository.wasUsedWithinGrace(
      current.id,
      this.graceSeconds(),
    );
    if (withinGrace) {
      await this.refreshTokensRepository.insert(successor);
      return { userId: current.userId, refreshToken: plaintext };
    }

    await this.refreshTokensRepository.revokeFamily(current.familyId);
    this.logger.warn('Refresh token reuse detected (post-grace replay)', {
      userId: current.userId,
      familyId: current.familyId,
    });
    throw new RefreshTokenReuseError();
  }

  private graceSeconds(): number {
    return this.configService.get<number>(
      'auth.session.refreshTokenGraceSeconds',
      60,
    );
  }
}
