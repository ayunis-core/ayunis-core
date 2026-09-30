import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RotateSessionCommand } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.command';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import {
  RefreshTokenReuseError,
  UnexpectedSessionsError,
} from 'src/iam/sessions/application/sessions.errors';

export interface RotateSessionResult {
  userId: UUID;
  refreshToken: string;
  authenticationMethod: SessionAuthenticationMethod;
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
    return this.rotate(command.current);
  }

  private async rotate(current: RefreshToken): Promise<RotateSessionResult> {
    const { token: successor, plaintext } = this.refreshTokenFactory.create({
      userId: current.userId,
      familyId: current.familyId,
      authenticationMethod: current.authenticationMethod,
      zitadelSessionId: current.zitadelSessionId,
      familyExpiresAt:
        current.authenticationMethod === SessionAuthenticationMethod.SSO
          ? (current.familyExpiresAt ?? current.expiresAt)
          : undefined,
    });

    const won = await this.refreshTokensRepository.markUsedAndInsertSuccessor(
      current.id,
      successor,
    );
    if (won) {
      return {
        userId: current.userId,
        refreshToken: plaintext,
        authenticationMethod: current.authenticationMethod,
      };
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
      return {
        userId: current.userId,
        refreshToken: plaintext,
        authenticationMethod: current.authenticationMethod,
      };
    }

    await this.refreshTokensRepository.revokeFamily(current.familyId);
    this.logger.warn(
      {
        userId: current.userId,
        familyId: current.familyId,
      },
      'Refresh token reuse detected (post-grace replay)',
    );
    throw new RefreshTokenReuseError();
  }

  private graceSeconds(): number {
    return this.configService.get<number>(
      'auth.session.refreshTokenGraceSeconds',
      60,
    );
  }
}
