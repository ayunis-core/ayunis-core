import { AssertCachedOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-cached-org-active/assert-cached-org-active.use-case';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { Request } from 'express';
import { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { JWT_SECRET } from 'src/iam/authentication/application/tokens/jwt-secret.token';
import { extractAccessToken } from 'src/common/util/access-token.util';
import {
  isSessionClient,
  type SessionClient,
} from 'src/iam/sessions/domain/value-objects/session-client';

interface JwtPayload {
  sub: UUID;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  systemRole: SystemRole;
  orgId: UUID;
  name: string;
  type?: string;
  orgSessionVersion?: number;
  client?: SessionClient;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    @Inject(JWT_SECRET) secret: string,
    private readonly assertOrgActive: AssertCachedOrgActiveUseCase,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const token = extractAccessToken(req, configService);

        if (!token) {
          this.logger.debug('No JWT found in cookie or Authorization header');
        }

        return token ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<ActiveUser | null> {
    // Special-purpose tokens (e.g. MFA pending) share the same secret and
    // carry a `type` claim; they must never authenticate as a session.
    if (payload.type !== undefined) {
      this.logger.warn('Rejected typed token presented as access token');
      return null;
    }

    // A legacy refresh token is a bare `{sub}` payload with no `email`. Without
    // this guard it would authenticate as a session with undefined role/orgId.
    if (!payload.email) {
      this.logger.warn(
        'Rejected token without email presented as access token',
      );
      return null;
    }

    // A client removed from the registry must not fall back to an
    // unrestricted browser session.
    if (payload.client !== undefined && !isSessionClient(payload.client)) {
      this.logger.warn('Rejected token for an unknown session client');
      return null;
    }

    await this.assertOrgActive.execute({
      orgId: payload.orgId,
      sessionVersion: payload.orgSessionVersion ?? 0,
    });
    return new ActiveUser({
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified,
      role: payload.role,
      systemRole: payload.systemRole,
      orgId: payload.orgId,
      name: payload.name,
      client: payload.client ?? null,
    });
  }
}
