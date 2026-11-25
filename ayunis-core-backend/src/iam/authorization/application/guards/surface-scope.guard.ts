import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { getTokenSurfaceScopes } from 'src/config/surface-registry';
import type { SurfaceScope } from 'src/config/surface-scope';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { SURFACE_SCOPE_KEY } from 'src/iam/authorization/application/decorators/surface-scope.decorator';
import { ClientNotAllowedError } from 'src/iam/authorization/application/authorization.errors';

@Injectable()
export class SurfaceScopeGuard implements CanActivate {
  private readonly logger = new Logger(SurfaceScopeGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;
    if (!user?.client) return true;

    const requiredScope = this.reflector.getAllAndOverride<
      SurfaceScope | undefined
    >(SURFACE_SCOPE_KEY, [context.getHandler(), context.getClass()]);
    if (
      requiredScope &&
      getTokenSurfaceScopes(user.client).includes(requiredScope)
    ) {
      return true;
    }

    this.logger.warn(
      {
        ...buildAccessDeniedAuditContext(request, user),
        client: user.client,
        requiredScope,
      },
      'Access denied: token surface lacks the required route scope',
    );
    throw new ClientNotAllowedError();
  }
}
