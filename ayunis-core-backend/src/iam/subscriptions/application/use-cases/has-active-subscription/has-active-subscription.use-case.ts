import { Injectable, Logger } from '@nestjs/common';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { getNextDate } from '../../util/get-date-for-anchor-and-cycle';
import { SubscriptionError } from '../../subscription.errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HasActiveSubscriptionUseCase {
  private readonly logger = new Logger(HasActiveSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: HasActiveSubscriptionQuery): Promise<boolean> {
    const isSelfHosted = this.configService.get('app.isSelfHosted');
    if (isSelfHosted) {
      return true;
    }

    this.logger.log('Checking active subscription', {
      orgId: query.orgId,
    });

    try {
      this.logger.debug('Finding subscription');
      const subscription = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      if (!subscription) {
        this.logger.debug('No subscription found for organization', {
          orgId: query.orgId,
        });
        return false;
      }

      if (subscription.cancelledAt) {
        this.logger.debug(
          'Subscription is cancelled, checking if still active',
          {
            subscriptionId: subscription.id,
            cancelledAt: subscription.cancelledAt,
          },
        );

        const lastBillingDate = getNextDate({
          anchorDate: subscription.renewalCycleAnchor,
          targetDate: subscription.cancelledAt,
          cycle: subscription.renewalCycle,
        });

        // If we're past the last billing date, subscription is no longer active
        if (new Date() > lastBillingDate) {
          this.logger.debug('Subscription is expired', {
            subscriptionId: subscription.id,
            lastBillingDate,
            currentDate: new Date(),
          });
          return false;
        }

        this.logger.debug('Subscription is cancelled but still active', {
          subscriptionId: subscription.id,
          lastBillingDate,
        });
      } else {
        this.logger.debug('Subscription is active', {
          subscriptionId: subscription.id,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Checking active subscription failed', {
        error,
        orgId: query.orgId,
      });
      throw error;
    }
  }
}
