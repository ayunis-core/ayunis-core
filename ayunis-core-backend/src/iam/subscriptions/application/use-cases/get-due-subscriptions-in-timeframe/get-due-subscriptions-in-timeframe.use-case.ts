import { Injectable, Logger } from '@nestjs/common';
import { GetDueSubscriptionsInTimeframeQuery } from './get-due-subscriptions-in-timeframe.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { getNextDate } from '../../util/get-date-for-anchor-and-cycle';
import { Subscription } from '../../../domain/subscription.entity';
import {
  InvalidSubscriptionDataError,
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class GetDueSubscriptionsInTimeframeUseCase {
  private readonly logger = new Logger(
    GetDueSubscriptionsInTimeframeUseCase.name,
  );

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(
    query: GetDueSubscriptionsInTimeframeQuery,
  ): Promise<Subscription[]> {
    this.logger.log('Getting due subscriptions in timeframe', {
      from: query.from,
      to: query.to,
    });

    try {
      this.logger.debug('Validating timeframe');
      if (query.from >= query.to) {
        this.logger.warn('Invalid timeframe provided', {
          from: query.from,
          to: query.to,
        });
        throw new InvalidSubscriptionDataError(
          'From date must be before to date',
        );
      }

      this.logger.debug('Finding all subscriptions');
      const subscriptions = await this.subscriptionRepository.findAll();

      this.logger.debug('Filtering subscriptions by timeframe', {
        totalSubscriptions: subscriptions.length,
      });

      const dueSubscriptions = subscriptions.filter((subscription) => {
        if (subscription.cancelledAt) {
          const lastBillingDate = getNextDate({
            anchorDate: subscription.renewalCycleAnchor,
            targetDate: subscription.cancelledAt,
            cycle: subscription.renewalCycle,
          });
          return (
            new Date(lastBillingDate) >= query.from &&
            new Date(lastBillingDate) < query.to
          );
        }
        const nextBillingDate = getNextDate({
          anchorDate: subscription.renewalCycleAnchor,
          targetDate: query.from,
          cycle: subscription.renewalCycle,
        });
        return (
          new Date(nextBillingDate) >= query.from &&
          new Date(nextBillingDate) < query.to
        );
      });

      this.logger.debug('Due subscriptions found', {
        dueSubscriptions: dueSubscriptions.length,
        totalSubscriptions: subscriptions.length,
      });

      return dueSubscriptions;
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Getting due subscriptions failed', {
        error,
        from: query.from,
        to: query.to,
      });
      throw error;
    }
  }
}
