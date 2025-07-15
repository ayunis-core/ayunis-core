import { Injectable, Logger } from '@nestjs/common';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { SubscriptionError } from '../../subscription.errors';
import { ConfigService } from '@nestjs/config';
import { isActive } from '../../util/is-active';

@Injectable()
export class HasActiveSubscriptionUseCase {
  private readonly logger = new Logger(HasActiveSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: HasActiveSubscriptionQuery): Promise<boolean> {
    // Self-hosted instances are not required to have an active subscription
    // This is used in the subscription guard to allow access to the subscription endpoint
    // And as a separate endpoint for the frontend to display "get a subscription" hints
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted');
    if (isSelfHosted) {
      return true;
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
        return false;
      }

      for (const subscription of subscriptions) {
        if (isActive(subscription)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
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
