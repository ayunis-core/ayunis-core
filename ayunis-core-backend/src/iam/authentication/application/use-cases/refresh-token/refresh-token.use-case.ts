import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from 'src/iam/authentication/application/ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from 'src/iam/authentication/application/tokens/authentication-repository.token';
import { JwtService } from '@nestjs/jwt';
import type { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { RefreshTokenCommand } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.command';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import {
  InvalidTokenError,
  UnexpectedAuthenticationError,
} from 'src/iam/authentication/application/authentication.errors';
import { REFRESH_TOKEN_TYPE } from 'src/iam/authentication/domain/token-type.constants';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RotateSessionUseCase } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.use-case';
import { RotateSessionCommand } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.command';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { Transactional } from '@nestjs-cls/transactional';
import { PrepareSessionRotationCommand } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.command';
import { PrepareSessionRotationUseCase } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.use-case';

interface RefreshTokenPayload {
  sub?: string;
  type?: string;
  email?: string;
}

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  // eslint-disable-next-line max-params -- NestJS dependency injection
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly prepareSessionRotation: PrepareSessionRotationUseCase,
    private readonly rotateSessionUseCase: RotateSessionUseCase,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly localPasswordLoginPolicy: LocalPasswordLoginPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  @Transactional()
  async execute(command: RefreshTokenCommand): Promise<AuthTokens> {
    this.logger.log('refreshToken');
    return this.isJwt(command.refreshToken)
      ? this.refreshLegacy(command.refreshToken)
      : this.refreshOpaque(command.refreshToken);
  }

  private isJwt(token: string): boolean {
    return token.split('.').length === 3;
  }

  private async refreshOpaque(token: string): Promise<AuthTokens> {
    const current = await this.prepareSessionRotation.execute(
      new PrepareSessionRotationCommand(token),
    );
    const user = await this.findUser(current.userId);
    await this.localPasswordLoginPolicy.assertSessionIssuanceAllowed(
      user.orgId,
      current.authenticationMethod,
    );
    const rotated = await this.rotateSessionUseCase.execute(
      new RotateSessionCommand(current),
    );
    return this.issueTokens(user, rotated.refreshToken);
  }

  /**
   * Transitional path: a pre-deploy JWT refresh token is verified once and
   * migrated to an opaque stored session (a new family).
   *
   * FUTURE(AYC-452): remove ~7 days after deploy, once legacy JWT refresh
   * tokens have all expired.
   */
  private async refreshLegacy(token: string): Promise<AuthTokens> {
    const payload = this.verifyLegacyToken(token);
    if (!this.isAcceptableRefreshPayload(payload)) {
      throw new InvalidTokenError('Invalid token payload');
    }
    const userId = payload.sub as UUID;
    const user = await this.findUser(userId);
    await this.localPasswordLoginPolicy.assertSessionIssuanceAllowed(
      user.orgId,
      SessionAuthenticationMethod.PASSWORD,
    );
    const session = await this.createSessionUseCase.execute(
      new CreateSessionCommand(userId, SessionAuthenticationMethod.PASSWORD),
    );
    return this.issueTokens(user, session.refreshToken);
  }

  // A tampered or expired legacy JWT is invalid credentials (401), not an
  // unexpected failure — translate before the error boundary sees it.
  private verifyLegacyToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token);
    } catch (error: unknown) {
      this.logger.warn(
        { err: error as Error },
        'Legacy refresh token verification failed',
      );
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

  private async issueTokens(
    user: ActiveUser,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const accessToken = await this.authRepository.generateAccessToken(user);
    return new AuthTokens(accessToken, refreshToken);
  }

  private async findUser(userId: UUID): Promise<ActiveUser> {
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );
    return new ActiveUser({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      systemRole: user.systemRole,
      orgId: user.orgId,
      name: user.name,
    });
  }
}
