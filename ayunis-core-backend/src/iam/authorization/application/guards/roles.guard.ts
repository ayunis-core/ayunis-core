import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const contextRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Reflector returns T but is undefined at runtime when no metadata is set
    if (!contextRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const principal =
      (request.user as ActiveUser | undefined) ?? request.apiKey;
    if (!principal) {
      return false;
    }
    return contextRoles.some((role) => principal.role === role);
  }
}
