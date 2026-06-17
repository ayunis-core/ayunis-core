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
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { GetTrialUseCase } from 'src/iam/trials/application/use-cases/get-trial/get-trial.use-case';
import { GetTrialQuery } from 'src/iam/trials/application/use-cases/get-trial/get-trial.query';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import {
  REQUIRE_SUBSCRIPTION_KEY,
  RequireSubscriptionOptions,
} from '../decorators/subscription.decorator';

export interface SubscriptionContext {
  hasActiveSubscription: boolean;
  hasRemainingTrialMessages: boolean;
}

export interface RequestWithSubscriptionContext extends Request {
  user: ActiveUser | ApiKeyPrincipal;
  subscriptionContext?: SubscriptionContext;
}

interface GuardPrincipal {
  orgId: UUID;
  userId?: UUID;
  apiKeyId?: UUID;
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
    const options = this.reflector.getAllAndOverride<
      RequireSubscriptionOptions | undefined
    >(REQUIRE_SUBSCRIPTION_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithSubscriptionContext>();

    const principal = this.resolvePrincipal(request);
    if (!principal) {
      // On @Public() routes the global JwtAuthGuard skips, so the global
      // SubscriptionGuard binding runs before any controller-level auth (e.g.
      // AuthGuard('api-key')) populates `request.user`. Defer in that case —
      // the controller is expected to bind SubscriptionGuard locally AFTER
      // its auth guard so this re-runs with a principal in place.
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (isPublic) {
        return true;
      }
      this.logger.warn(
        'No principal found on request when checking subscription',
      );
      return false;
    }

    this.logger.debug('Checking subscription for organization', {
      orgId: principal.orgId,
      userId: principal.userId,
      apiKeyId: principal.apiKeyId,
      requiredType: options.type,
    });

    try {
      const { hasActiveSubscription } =
        await this.hasActiveSubscriptionUseCase.execute(
          new HasActiveSubscriptionQuery(principal.orgId, options.type),
        );

      if (hasActiveSubscription) {
        this.logger.debug('Access granted: active subscription found', {
          orgId: principal.orgId,
          requiredType: options.type,
        });

        request.subscriptionContext = {
          hasActiveSubscription: true,
          hasRemainingTrialMessages: false,
        };

        return true;
      }

      this.logger.debug('No matching subscription, checking trial capacity', {
        orgId: principal.orgId,
      });

      const trial = await this.getTrialUseCase.execute(
        new GetTrialQuery(principal.orgId),
      );

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive guard for runtime safety
      if (!trial) {
        this.logger.warn('Access denied: no trial found', {
          orgId: principal.orgId,
        });

        return false;
      }

      const hasRemainingMessages = trial.messagesSent < trial.maxMessages;
      const remainingMessages = trial.maxMessages - trial.messagesSent;

      if (hasRemainingMessages) {
        this.logger.debug('Access granted: trial has remaining messages', {
          orgId: principal.orgId,
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
        orgId: principal.orgId,
        messagesSent: trial.messagesSent,
        maxMessages: trial.maxMessages,
      });

      return false;
    } catch (error) {
      this.logger.error('Error checking subscription/trial', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: principal.orgId,
      });

      return false;
    }
  }

  private resolvePrincipal(
    request: RequestWithSubscriptionContext,
  ): GuardPrincipal | null {
    const user = request.user as unknown;
    if (!user || typeof user !== 'object') {
      return null;
    }
    if ('apiKeyId' in user) {
      const apiKeyPrincipal = user as ApiKeyPrincipal;
      return {
        orgId: apiKeyPrincipal.orgId,
        apiKeyId: apiKeyPrincipal.apiKeyId,
      };
    }
    if ('orgId' in user && 'id' in user) {
      const activeUser = user as ActiveUser;
      return {
        orgId: activeUser.orgId,
        userId: activeUser.id,
      };
    }
    return null;
  }
}
