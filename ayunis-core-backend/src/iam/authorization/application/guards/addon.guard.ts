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
      this.logger.warn('No principal found on request when checking addon', {
        requiredAddon,
      });
      return false;
    }

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
