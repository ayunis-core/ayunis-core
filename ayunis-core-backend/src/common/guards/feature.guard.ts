import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { FeaturesConfig } from 'src/config/features.config';

export const FEATURE_KEY = 'feature';

export const RequireFeature = (flag: keyof FeaturesConfig) =>
  applyDecorators(SetMetadata(FEATURE_KEY, flag), UseGuards(FeatureGuard));

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const featureName = this.reflector.getAllAndOverride<
      keyof FeaturesConfig | undefined
    >(FEATURE_KEY, [context.getHandler(), context.getClass()]);

    if (!featureName) {
      return true;
    }

    const isEnabled = this.configService.get<boolean>(
      `features.${featureName}`,
    );

    if (!isEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
