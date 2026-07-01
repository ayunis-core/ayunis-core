import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';

@Injectable()
export class SystemRolesGuard implements CanActivate {
  private readonly logger = new Logger(SystemRolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      SystemRole[] | undefined
    >(SYSTEM_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;

    if (user && requiredRoles.some((role) => user.systemRole === role)) {
      return true;
    }

    this.logger.warn('Access denied: insufficient system role', {
      ...buildAccessDeniedAuditContext(request, user),
      userSystemRole: user?.systemRole,
      requiredSystemRoles: requiredRoles,
    });
    return false;
  }
}
