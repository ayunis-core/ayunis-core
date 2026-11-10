import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import {
  RefreshTokenReuseError,
  UnexpectedSessionsError,
} from 'src/iam/sessions/application/sessions.errors';
import { ForkSessionCommand } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.command';
import type { RotateSessionResult } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

/**
 * Starts a new, client-bound family from a valid session without touching it.
 * The fork keeps the provenance (method, broker session, SSO family expiry) so
 * SSO logout and organisation revocations still reach it.
 */
@Injectable()
export class ForkSessionUseCase {
  private readonly logger = new Logger(ForkSessionUseCase.name);

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly refreshTokenFactory: RefreshTokenFactory,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: ForkSessionCommand): Promise<RotateSessionResult> {
    const { current, client } = command;
    await this.assertNotReplayed(command);

    const { token, plaintext } = this.refreshTokenFactory.create({
      userId: current.userId,
      familyId: this.refreshTokenFactory.newFamilyId(),
      authenticationMethod: current.authenticationMethod,
      zitadelSessionId: current.zitadelSessionId,
      familyExpiresAt:
        current.authenticationMethod === SessionAuthenticationMethod.SSO
          ? (current.familyExpiresAt ?? current.expiresAt)
          : undefined,
      client,
    });
    await this.refreshTokensRepository.insert(token);

    return {
      userId: current.userId,
      refreshToken: plaintext,
      authenticationMethod: current.authenticationMethod,
      client,
    };
  }

  // A used token is only acceptable inside the rotation grace window (the
  // browser refreshed concurrently); later it is a replay, as in rotation.
  private async assertNotReplayed({ current }: ForkSessionCommand) {
    if (!current.usedAt) return;
    const withinGrace = await this.refreshTokensRepository.wasUsedWithinGrace(
      current.id,
      this.configService.get<number>(
        'auth.session.refreshTokenGraceSeconds',
        60,
      ),
    );
    if (withinGrace) return;
    this.logger.warn(
      { userId: current.userId, familyId: current.familyId },
      'Refresh token reuse detected (fork of a rotated token)',
    );
    throw new RefreshTokenReuseError();
  }
}
