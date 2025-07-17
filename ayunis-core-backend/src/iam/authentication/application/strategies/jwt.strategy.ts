import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ActiveUser } from '../../domain/active-user.entity';
import { Request } from 'express';
import { UUID } from 'crypto';
import { UserRole } from '../../../users/domain/value-objects/role.object';

interface JwtPayload {
  sub: UUID;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  orgId: UUID;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const cookieName = configService.get<string>(
          'auth.cookie.accessTokenName',
          'access_token',
        );

        const token = req.cookies?.[cookieName] as string;

        if (!token) {
          this.logger.debug(`No JWT token found in cookie: ${cookieName}`);
          this.logger.debug(
            `Available cookies: ${Object.keys(req.cookies || {}).join(', ')}`,
          );
        }

        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get(
        'auth.jwt.secret',
        'dev-secret-change-in-production',
      ),
    });
  }

  validate(payload: JwtPayload): ActiveUser {
    this.logger.debug('Validating JWT payload', { payload });

    return new ActiveUser({
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified,
      role: payload.role,
      orgId: payload.orgId,
      name: payload.name,
    });
  }
}
