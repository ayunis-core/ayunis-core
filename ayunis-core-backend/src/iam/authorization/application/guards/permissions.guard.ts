import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<
      Permission | undefined
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;

    if (!user) {
      this.logger.warn('Access denied: no principal for permission check', {
        ...buildAccessDeniedAuditContext(request, user),
        requiredPermission,
      });
      return false;
    }

    const allowed = await this.hasPermissionUseCase.execute(
      new HasPermissionQuery(user.orgId, user.role, requiredPermission),
    );

    if (!allowed) {
      this.logger.warn('Access denied: missing permission', {
        ...buildAccessDeniedAuditContext(request, user),
        userRole: user.role,
        requiredPermission,
      });
    }

    return allowed;
  }
}
