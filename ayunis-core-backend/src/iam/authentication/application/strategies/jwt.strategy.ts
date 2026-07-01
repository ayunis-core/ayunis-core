import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ActiveUser } from '../../domain/active-user.entity';
import { Request } from 'express';
import { UUID } from 'crypto';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { JWT_SECRET } from '../tokens/jwt-secret.token';

interface JwtPayload {
  sub: UUID;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  systemRole: SystemRole;
  orgId: UUID;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    @Inject(JWT_SECRET) secret: string,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const cookieName = configService.get<string>(
          'auth.cookie.accessTokenName',
          'access_token',
        );

        const token = req.cookies[cookieName] as string;

        if (!token) {
          this.logger.debug(`No JWT token found in cookie: ${cookieName}`);
        }

        return token;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): ActiveUser {
    return new ActiveUser({
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified,
      role: payload.role,
      systemRole: payload.systemRole,
      orgId: payload.orgId,
      name: payload.name,
    });
  }
}
