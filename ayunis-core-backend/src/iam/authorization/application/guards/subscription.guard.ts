import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { GetTrialUseCase } from 'src/iam/subscriptions/application/use-cases/get-trial/get-trial.use-case';
import { GetTrialQuery } from 'src/iam/subscriptions/application/use-cases/get-trial/get-trial.query';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

export interface SubscriptionContext {
  hasActiveSubscription: boolean;
  hasRemainingTrialMessages: boolean;
}

export interface RequestWithSubscriptionContext extends Request {
  user: ActiveUser;
  subscriptionContext?: SubscriptionContext;
}

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getTrialUseCase: GetTrialUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresSubscription) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithSubscriptionContext>();
    const user = request.user;

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

      if (hasActiveSubscription) {
        this.logger.debug('Access granted: active subscription found', {
          orgId: user.orgId,
          userId: user.id,
        });

        request.subscriptionContext = {
          hasActiveSubscription: true,
          hasRemainingTrialMessages: false,
        };

        return true;
      }

      this.logger.debug('No active subscription, checking trial capacity', {
        orgId: user.orgId,
        userId: user.id,
      });

      const trial = await this.getTrialUseCase.execute(
        new GetTrialQuery(user.orgId),
      );

      if (!trial) {
        this.logger.warn('Access denied: no trial found', {
          orgId: user.orgId,
          userId: user.id,
        });

        return false;
      }

      const hasRemainingMessages = trial.messagesSent < trial.maxMessages;
      const remainingMessages = trial.maxMessages - trial.messagesSent;

      if (hasRemainingMessages) {
        this.logger.debug('Access granted: trial has remaining messages', {
          orgId: user.orgId,
          userId: user.id,
          messagesSent: trial.messagesSent,
          maxMessages: trial.maxMessages,
          remainingMessages,
        });

        request.subscriptionContext = {
          hasActiveSubscription: false,
          hasRemainingTrialMessages: true,
        };

        return true;
      }

      this.logger.warn('Access denied: trial exhausted', {
        orgId: user.orgId,
        userId: user.id,
        messagesSent: trial.messagesSent,
        maxMessages: trial.maxMessages,
      });

      return false;
    } catch (error) {
      this.logger.error('Error checking subscription/trial', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: user.orgId,
        userId: user.id,
      });

      return false;
    }
  }
}
