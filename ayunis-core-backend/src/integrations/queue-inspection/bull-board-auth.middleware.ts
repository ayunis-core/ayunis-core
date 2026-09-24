import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { UUID } from 'crypto';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { IpAllowlistGuard } from 'src/iam/ip-allowlist/application/guards/ip-allowlist.guard';
import { IpNotAllowedError } from 'src/iam/ip-allowlist/application/ip-allowlist.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { getAccessTokenCookieName } from 'src/common/util/cookie.util';

interface QueueOperatorClaims {
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  orgId?: string;
  role?: UserRole;
  systemRole?: SystemRole;
  name?: string;
  type?: string;
}

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BullBoardAuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly ipAllowlistGuard: IpAllowlistGuard,
    private readonly configService: ConfigService,
  ) {}

  async use(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = this.readAccessToken(request);
    const operator = await this.verifySessionToken(token);

    if (!operator) {
      this.reject(response, 401, 'Unauthenticated queue inspection request');
      return;
    }

    if (operator.systemRole !== SystemRole.SUPER_ADMIN) {
      this.logger.warn(
        {
          userId: operator.id,
          userSystemRole: operator.systemRole,
          method: request.method,
          path: request.originalUrl,
        },
        'Access denied: queue inspection requires super admin',
      );
      response.status(403).send('Forbidden');
      return;
    }

    const ipAllowed = await this.isRequestIpAllowed(request, operator);
    if (!ipAllowed) {
      response.status(403).send('Forbidden');
      return;
    }

    next();
  }

  private async isRequestIpAllowed(
    request: Request,
    operator: ActiveUser,
  ): Promise<boolean> {
    try {
      return await this.ipAllowlistGuard.canActivateRequest(request, operator);
    } catch (error) {
      if (error instanceof IpNotAllowedError) {
        return false;
      }
      throw error;
    }
  }

  private async verifySessionToken(
    token: string | undefined,
  ): Promise<ActiveUser | null> {
    if (!token) {
      return null;
    }

    try {
      const claims =
        await this.jwtService.verifyAsync<QueueOperatorClaims>(token);
      return this.toActiveUser(claims);
    } catch {
      return null;
    }
  }

  private toActiveUser(claims: QueueOperatorClaims): ActiveUser | null {
    if (
      claims.type !== undefined ||
      !claims.sub ||
      !claims.email ||
      claims.emailVerified !== true ||
      !claims.orgId ||
      !claims.name ||
      !isUserRole(claims.role) ||
      !isSystemRole(claims.systemRole)
    ) {
      return null;
    }

    return new ActiveUser({
      id: claims.sub as UUID,
      email: claims.email,
      emailVerified: claims.emailVerified,
      orgId: claims.orgId as UUID,
      role: claims.role,
      systemRole: claims.systemRole,
      name: claims.name,
    });
  }

  private readAccessToken(request: Request): string | undefined {
    const parsedCookies = request.cookies as
      Partial<Record<string, string>> | undefined;
    return parsedCookies?.[getAccessTokenCookieName(this.configService)];
  }

  private reject(response: Response, status: number, message: string): void {
    this.logger.warn(message);
    response.status(status).send('Unauthorized');
  }
}

function isUserRole(role: UserRole | undefined): role is UserRole {
  return role !== undefined && Object.values(UserRole).includes(role);
}

function isSystemRole(role: SystemRole | undefined): role is SystemRole {
  return role !== undefined && Object.values(SystemRole).includes(role);
}
