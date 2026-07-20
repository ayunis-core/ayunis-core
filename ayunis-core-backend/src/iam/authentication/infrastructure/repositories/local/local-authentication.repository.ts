import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationRepository } from 'src/iam/authentication/application/ports/authentication.repository';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { StringValue } from 'ms';

interface JwtConfig {
  secret: string;
  expiresIn: StringValue;
  refreshTokenExpiresIn: StringValue;
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

  generateAccessToken(user: ActiveUser): Promise<string> {
    this.logger.log('generateAccessToken', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    try {
      return Promise.resolve(this.signAccessToken(user));
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private signAccessToken(user: ActiveUser): string {
    const jwtConfig = this.configService.get<JwtConfig>('auth.jwt');
    if (!jwtConfig) {
      throw new Error('JWT configuration is missing');
    }

    return this.jwtService.sign(
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
    );
  }
}
