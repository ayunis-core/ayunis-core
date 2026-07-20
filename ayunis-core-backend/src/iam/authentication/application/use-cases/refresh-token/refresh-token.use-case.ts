import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { JwtService } from '@nestjs/jwt';
import type { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { RefreshTokenCommand } from './refresh-token.command';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import {
  InvalidTokenError,
  UnexpectedAuthenticationError,
} from '../../authentication.errors';
import { REFRESH_TOKEN_TYPE } from 'src/iam/authentication/domain/token-type.constants';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RotateSessionUseCase } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.use-case';
import { RotateSessionCommand } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.command';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';

interface RefreshTokenPayload {
  sub?: string;
  type?: string;
  email?: string;
}

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly rotateSessionUseCase: RotateSessionUseCase,
    private readonly createSessionUseCase: CreateSessionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  async execute(command: RefreshTokenCommand): Promise<AuthTokens> {
    this.logger.log('refreshToken');
    const rotated = this.isJwt(command.refreshToken)
      ? await this.migrateLegacyToken(command.refreshToken)
      : await this.rotate(command.refreshToken);

    const accessToken = await this.issueAccessToken(rotated.userId);
    return new AuthTokens(accessToken, rotated.refreshToken);
  }

  private isJwt(token: string): boolean {
    return token.split('.').length === 3;
  }

  private async rotate(
    token: string,
  ): Promise<{ userId: UUID; refreshToken: string }> {
    const result = await this.rotateSessionUseCase.execute(
      new RotateSessionCommand(token),
    );
    return { userId: result.userId, refreshToken: result.refreshToken };
  }

  /**
   * Transitional path: a pre-deploy JWT refresh token is verified once and
   * migrated to an opaque stored session (a new family).
   *
   * FUTURE(AYC-452): remove ~7 days after deploy, once legacy JWT refresh
   * tokens have all expired.
   */
  private async migrateLegacyToken(
    token: string,
  ): Promise<{ userId: UUID; refreshToken: string }> {
    const payload = this.verifyLegacyToken(token);
    if (!this.isAcceptableRefreshPayload(payload)) {
      throw new InvalidTokenError('Invalid token payload');
    }
    const userId = payload.sub as UUID;
    const session = await this.createSessionUseCase.execute(
      new CreateSessionCommand(userId),
    );
    return { userId, refreshToken: session.refreshToken };
  }

  // A tampered or expired legacy JWT is invalid credentials (401), not an
  // unexpected failure — translate before the error boundary sees it.
  private verifyLegacyToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token);
    } catch (error: unknown) {
      this.logger.warn('Legacy refresh token verification failed', { error });
      throw new InvalidTokenError('Unable to verify refresh token');
    }
  }

  private isAcceptableRefreshPayload(payload: RefreshTokenPayload): boolean {
    if (!payload.sub) {
      return false;
    }
    if (payload.type === REFRESH_TOKEN_TYPE) {
      return true;
    }
    // A legacy refresh token is a bare `{sub}` payload; access tokens always
    // carry `email` and special-purpose tokens carry a `type`.
    return payload.type === undefined && payload.email === undefined;
  }

  private async issueAccessToken(userId: UUID): Promise<string> {
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );
    return this.authRepository.generateAccessToken(
      new ActiveUser({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        systemRole: user.systemRole,
        orgId: user.orgId,
        name: user.name,
      }),
    );
  }
}
