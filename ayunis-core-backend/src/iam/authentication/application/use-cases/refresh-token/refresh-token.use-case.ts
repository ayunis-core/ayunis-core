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
      const payload = this.jwtService.verify<{ sub: string }>(
        command.refreshToken,
      );

      if (!payload || !payload.sub) {
        throw new InvalidTokenError('Invalid token payload');
      }

      const userId =
        payload.sub as `${string}-${string}-${string}-${string}-${string}`;
      this.logger.debug('Token verified successfully', { userId });

      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId),
      );

      return this.authRepository.generateTokens(
        new ActiveUser(user.id, user.email, user.role, user.orgId, user.name),
      );
    } catch (error: unknown) {
      this.logger.error('Token verification failed', { error });
      throw new InvalidTokenError('Unable to verify refresh token');
    }
  }
}
