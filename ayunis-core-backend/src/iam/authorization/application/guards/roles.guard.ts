import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

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

    this.logger.warn('Access denied: insufficient role', {
      ...buildAccessDeniedAuditContext(request, user),
      userRole: user?.role,
      requiredRoles: contextRoles,
    });
    return false;
  }
}
