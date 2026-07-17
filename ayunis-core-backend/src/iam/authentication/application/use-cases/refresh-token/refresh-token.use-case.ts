import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdUseCase } from '../../../../users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from '../../../../users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { RefreshTokenCommand } from './refresh-token.command';
import { AuthTokens } from '../../../domain/auth-tokens.entity';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidTokenError } from '../../authentication.errors';
import { REFRESH_TOKEN_TYPE } from '../../../domain/token-type.constants';

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
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthTokens> {
    this.logger.log('refreshToken');
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        command.refreshToken,
      );

      if (!this.isAcceptableRefreshPayload(payload)) {
        throw new InvalidTokenError('Invalid token payload');
      }

      const userId =
        payload.sub as `${string}-${string}-${string}-${string}-${string}`;
      this.logger.debug('Token verified successfully', { userId });

      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId),
      );

      return this.authRepository.generateTokens(
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
    } catch (error: unknown) {
      this.logger.error('Token verification failed', { error });
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
    // FUTURE(AYC-451): remove this legacy grace ~7 days after deploy. It accepts
    // refresh tokens minted before the `type` claim existed. A legacy refresh
    // token is a bare `{sub}` payload; access tokens always carry `email` and
    // every special-purpose token carries a `type`, so this shape check accepts
    // only genuine legacy refresh tokens and closes the access-as-refresh hole
    // immediately without invalidating existing sessions.
    return payload.type === undefined && payload.email === undefined;
  }
}
