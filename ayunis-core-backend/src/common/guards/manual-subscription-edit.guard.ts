import {
  applyDecorators,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const ADDON_TYPE_KEY = 'manualSubscriptionEditAddonType';

export const RequireManualSubscriptionEditing = (addonType?: string) =>
  applyDecorators(
    SetMetadata(ADDON_TYPE_KEY, addonType),
    UseGuards(ManualSubscriptionEditGuard),
  );

@Injectable()
export class ManualSubscriptionEditGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const addonType = this.reflector.getAllAndOverride<string | undefined>(
      ADDON_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (addonType && request.params.type !== addonType) return true;
    if (
      this.config.get<boolean>('app.isCloudHosted', false) &&
      this.config.get<boolean>(
        'features.fynnManagedSubscriptionsEnabled',
        false,
      )
    ) {
      throw new ForbiddenException('Subscriptions are managed in Fynn');
    }
    return true;
  }
}
