import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
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
    if (!contextRoles) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = context.switchToHttp().getRequest().user as ActiveUser;
    return contextRoles.some((role) => user.role === role);
  }
}
