import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ActivePrincipal } from 'src/iam/authentication/domain/active-principal.entity';
import { getPrincipal } from 'src/iam/authentication/application/util/get-principal';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { GetTrialUseCase } from 'src/iam/trials/application/use-cases/get-trial/get-trial.use-case';
import { GetTrialQuery } from 'src/iam/trials/application/use-cases/get-trial/get-trial.query';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

export interface SubscriptionContext {
  hasActiveSubscription: boolean;
  hasRemainingTrialMessages: boolean;
}

export interface RequestWithSubscriptionContext extends Request {
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
    if (!requiresSubscription) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithSubscriptionContext>();
    const principal = getPrincipal(request);
    if (!principal) {
      this.logger.warn('No authenticated principal in request context');
      return false;
    }

    const orgId = principal.orgId;
    try {
      return await this.checkSubscription(request, orgId);
    } catch (error) {
      this.logger.error('Error checking subscription/trial', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
      });
      return false;
    }
  }

  private async checkSubscription(
    request: RequestWithSubscriptionContext,
    orgId: ActivePrincipal['orgId'],
  ): Promise<boolean> {
    const { hasActiveSubscription } =
      await this.hasActiveSubscriptionUseCase.execute(
        new HasActiveSubscriptionQuery(orgId),
      );
    if (hasActiveSubscription) {
      request.subscriptionContext = {
        hasActiveSubscription: true,
        hasRemainingTrialMessages: false,
      };
      return true;
    }
    return this.checkTrialCapacity(request, orgId);
  }

  private async checkTrialCapacity(
    request: RequestWithSubscriptionContext,
    orgId: ActivePrincipal['orgId'],
  ): Promise<boolean> {
    const trial = await this.getTrialUseCase.execute(new GetTrialQuery(orgId));
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive guard for runtime safety
    if (!trial) {
      this.logger.warn('Access denied: no trial found', { orgId });
      return false;
    }
    if (trial.messagesSent < trial.maxMessages) {
      request.subscriptionContext = {
        hasActiveSubscription: false,
        hasRemainingTrialMessages: true,
      };
      return true;
    }
    this.logger.warn('Access denied: trial exhausted', {
      orgId,
      messagesSent: trial.messagesSent,
      maxMessages: trial.maxMessages,
    });
    return false;
  }
}
