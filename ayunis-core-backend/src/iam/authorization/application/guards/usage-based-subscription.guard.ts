import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { UUID } from 'crypto';

import { ApplicationError } from 'src/common/errors/base.error';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { ApiKeyPrincipal } from 'src/iam/authentication/application/strategies/api-key.strategy';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

import { SubscriptionRequiredError } from '../authorization.errors';
import { REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY } from '../decorators/usage-based-subscription.decorator';

type RequestPrincipal = ActiveUser | ApiKeyPrincipal;

interface RequestWithPrincipal extends Request {
  user?: RequestPrincipal;
}

@Injectable()
export class UsageBasedSubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(UsageBasedSubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.requiresUsageBasedSubscription(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const orgId = this.getOrgId(request);

    if (!orgId) {
      return this.handleMissingPrincipal(context);
    }

    return this.hasUsageBasedSubscription(orgId);
  }

  private requiresUsageBasedSubscription(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(
        REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? false
    );
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private handleMissingPrincipal(context: ExecutionContext): boolean {
    /**
     * On @Public() routes, the global JwtAuthGuard does not populate request.user.
     * Controller-level auth may still run later, so we intentionally defer here.
     */
    if (this.isPublicRoute(context)) {
      return true;
    }

    this.logger.warn(
      'Access denied: missing request principal while checking usage-based subscription',
    );

    return false;
  }

  private async hasUsageBasedSubscription(orgId: UUID): Promise<boolean> {
    try {
      const isUsageBased = await this.isUsageBasedSubscriptionUseCase.execute(
        new IsUsageBasedSubscriptionQuery(orgId),
      );

      if (!isUsageBased) {
        this.logger.warn(
          `Access denied: org ${orgId} has no active usage-based subscription`,
        );
        throw new SubscriptionRequiredError(SubscriptionType.USAGE_BASED);
      }

      return isUsageBased;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(
        `Failed to check usage-based subscription for org ${orgId}`,
        error instanceof Error ? error.stack : undefined,
      );

      return false;
    }
  }

  private getOrgId(request: RequestWithPrincipal): UUID | null {
    return request.user?.orgId ?? null;
  }
}
