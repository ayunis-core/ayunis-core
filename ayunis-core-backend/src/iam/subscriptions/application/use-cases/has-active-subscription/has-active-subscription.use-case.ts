import { Injectable, Logger } from '@nestjs/common';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { HasActiveSubscriptionResult } from './has-active-subscription.result';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { ConfigService } from '@nestjs/config';
import { isActive } from '../../util/is-active';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class HasActiveSubscriptionUseCase {
  private readonly logger = new Logger(HasActiveSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    query: HasActiveSubscriptionQuery,
  ): Promise<HasActiveSubscriptionResult> {
    // Self-hosted instances are not required to have an active subscription
    // This is used in the subscription guard to allow access to the subscription endpoint
    // And as a separate endpoint for the frontend to display "get a subscription" hints
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted');
    if (isSelfHosted) {
      return { hasActiveSubscription: true, subscriptionType: null };
    }

    this.logger.log('Checking active subscription', {
      orgId: query.orgId,
    });

    try {
      this.logger.debug('Finding subscription');
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      if (subscriptions.length === 0) {
        this.logger.debug('No subscription found for organization', {
          orgId: query.orgId,
        });
        return { hasActiveSubscription: false, subscriptionType: null };
      }

      for (const subscription of subscriptions) {
        if (isActive(subscription)) {
          return {
            hasActiveSubscription: true,
            subscriptionType: subscription.type,
          };
        }
      }

      return { hasActiveSubscription: false, subscriptionType: null };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Checking active subscription failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });
      throw error;
    }
  }
}
