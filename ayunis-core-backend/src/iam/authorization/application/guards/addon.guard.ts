import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { UUID } from 'crypto';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { ApiKeyPrincipal } from 'src/iam/authentication/application/strategies/api-key.strategy';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { IsAddonActiveUseCase } from 'src/iam/addons/application/use-cases/is-addon-active/is-addon-active.use-case';
import { IsAddonActiveQuery } from 'src/iam/addons/application/use-cases/is-addon-active/is-addon-active.query';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { REQUIRE_ADDON_KEY } from '../decorators/addon.decorator';

interface RequestWithUser extends Request {
  user?: ActiveUser | ApiKeyPrincipal;
}

@Injectable()
export class AddonGuard implements CanActivate {
  private readonly logger = new Logger(AddonGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly isAddonActiveUseCase: IsAddonActiveUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAddon = this.reflector.getAllAndOverride<
      AddonType | undefined
    >(REQUIRE_ADDON_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredAddon) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const orgId = this.resolveOrgId(request);
    if (!orgId) {
      // On @Public() routes the global JwtAuthGuard skips, so the global
      // AddonGuard binding runs before any controller-level auth (e.g.
      // AuthGuard('api-key')) populates `request.user`. Defer in that case —
      // the controller is expected to bind AddonGuard locally AFTER its auth
      // guard so this re-runs with a principal in place.
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (isPublic) {
        return true;
      }
      this.logger.warn('No principal found on request when checking addon', {
        requiredAddon,
      });
      return false;
    }

    try {
      const isActive = await this.isAddonActiveUseCase.execute(
        new IsAddonActiveQuery(orgId, requiredAddon),
      );
      if (!isActive) {
        this.logger.warn('Access denied: required addon not active', {
          orgId,
          requiredAddon,
        });
      }
      return isActive;
    } catch (error) {
      this.logger.error('Error checking addon', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        requiredAddon,
      });
      return false;
    }
  }

  private resolveOrgId(request: RequestWithUser): UUID | null {
    const user = request.user as unknown;
    if (!user || typeof user !== 'object') {
      return null;
    }
    if ('orgId' in user) {
      return (user as { orgId: UUID }).orgId;
    }
    return null;
  }
}
