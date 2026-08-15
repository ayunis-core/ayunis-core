import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(RolesGuard.name)
    private readonly logger: PinoLogger,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const contextRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!contextRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;

    if (user && contextRoles.some((role) => user.role === role)) {
      return true;
    }

    this.logger.warn(
      {
        ...buildAccessDeniedAuditContext(request, user),
        userRole: user?.role,
        requiredRoles: contextRoles,
      },
      'Access denied: insufficient role',
    );
    return false;
  }
}
