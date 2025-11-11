import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationRepository } from '../../../application/ports/authentication.repository';
import { ActiveUser } from '../../../domain/active-user.entity';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';

interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshTokenExpiresIn: string;
}

@Injectable()
export class LocalAuthenticationRepository extends AuthenticationRepository {
  private readonly logger = new Logger(LocalAuthenticationRepository.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.logger.log('constructor');
  }

  generateTokens(user: ActiveUser): Promise<AuthTokens> {
    this.logger.log('generateTokens', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    return Promise.resolve(this.createTokens(user));
  }

  private createTokens(user: ActiveUser): AuthTokens {
    const jwtConfig = this.configService.get<JwtConfig>('auth.jwt');
    if (!jwtConfig) {
      throw new Error('JWT configuration is missing');
    }

    return {
      access_token: this.jwtService.sign(
        {
          email: user.email,
          emailVerified: user.emailVerified,
          sub: user.id,
          orgId: user.orgId,
          role: user.role,
          systemRole: user.systemRole,
          name: user.name,
        },
        {
          expiresIn: jwtConfig.expiresIn,
        },
      ),
      refresh_token: this.jwtService.sign(
        { sub: user.id },
        {
          expiresIn: jwtConfig.refreshTokenExpiresIn,
        },
      ),
    };
  }
}
