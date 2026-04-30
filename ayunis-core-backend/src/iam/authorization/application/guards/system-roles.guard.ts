import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';
import { getPrincipal } from 'src/iam/authentication/application/util/get-principal';

@Injectable()
export class SystemRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Reflector returns T but is undefined at runtime when no metadata is set
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const principal = getPrincipal(request);
    if (!principal) {
      return false;
    }
    return requiredRoles.some((role) => principal.systemRole === role);
  }
}
