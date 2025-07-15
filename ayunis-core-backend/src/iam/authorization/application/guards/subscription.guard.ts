import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresSubscription) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user: ActiveUser = context.switchToHttp().getRequest().user;
    if (!user) {
      this.logger.warn('User not found in request context');
      return false;
    }

    this.logger.debug('Checking subscription for organization', {
      orgId: user.orgId,
      userId: user.id,
    });

    try {
      const hasActiveSubscription =
        await this.hasActiveSubscriptionUseCase.execute(
          new HasActiveSubscriptionQuery(user.orgId),
        );

      if (!hasActiveSubscription) {
        this.logger.warn('Access denied: no active subscription', {
          orgId: user.orgId,
          userId: user.id,
        });
      }

      return hasActiveSubscription;
    } catch (error) {
      this.logger.error('Error checking subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: user.orgId,
        userId: user.id,
      });
      return false;
    }
  }
}
