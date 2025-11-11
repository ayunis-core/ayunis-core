import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

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
    const user = context.switchToHttp().getRequest().user as ActiveUser;
    return requiredRoles.some((role) => user.systemRole === role);
  }
}
