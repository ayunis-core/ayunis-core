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
import { REQUIRE_PERMISSION_KEY } from 'src/iam/authorization/application/decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;

    if (!user) {
      this.logger.warn(
        {
          ...buildAccessDeniedAuditContext(request, user),
          requiredPermissions,
        },
        'Access denied: no principal for permission check',
      );
      return false;
    }

    const grants = await Promise.all(
      requiredPermissions.map((permission) =>
        this.hasPermissionUseCase.execute(
          new HasPermissionQuery(user.orgId, user.role, permission),
        ),
      ),
    );
    const allowed = grants.includes(true);

    if (!allowed) {
      this.logger.warn(
        {
          ...buildAccessDeniedAuditContext(request, user),
          userRole: user.role,
          requiredPermissions,
        },
        'Access denied: missing permission',
      );
    }

    return allowed;
  }
}
