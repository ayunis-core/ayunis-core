import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

interface RequestWithUser {
  user?: ActiveUser;
}

@Injectable()
export class SystemRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      return false;
    }
    return requiredRoles.some((role) => user.systemRole === role);
  }
}
