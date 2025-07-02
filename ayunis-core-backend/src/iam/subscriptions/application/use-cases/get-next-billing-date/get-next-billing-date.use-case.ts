import { Injectable } from '@nestjs/common';
import { GetNextBillingDateQuery } from './get-next-billing-date.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { BillingCycle } from 'src/iam/subscriptions/domain/value-objects/billing-cycle.enum';

@Injectable()
export class GetNextBillingDateUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(query: GetNextBillingDateQuery): Promise<Date> {
    const subscription = await this.subscriptionRepository.findByOrgId(
      query.orgId,
    );
    if (!subscription) {
      // TODO: Handle this case
      throw new Error('Subscription not found');
    }
    return this.getNextBillingDate(subscription);
  }

  private getNextBillingDate(subscription: Subscription): Date {
    const anchor = new Date(subscription.billingCycleAnchor);
    const now = new Date();

    // If subscription is cancelled, return the cancellation date
    if (subscription.cancelledAt) {
      return subscription.cancelledAt;
    }

    let nextBillingDate = new Date(anchor);

    // Calculate the next billing date based on the billing cycle
    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      // Add months until we get a date in the future
      while (nextBillingDate <= now) {
        nextBillingDate = this.addMonths(nextBillingDate, 1);
      }
    } else if (subscription.billingCycle === BillingCycle.YEARLY) {
      // Add years until we get a date in the future
      while (nextBillingDate <= now) {
        nextBillingDate = this.addYears(nextBillingDate, 1);
      }
    }

    return nextBillingDate;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const targetMonth = result.getMonth() + months;
    result.setMonth(targetMonth);

    // Handle month overflow (e.g., Jan 31 + 1 month should be Feb 28/29, not Mar 3)
    if (result.getMonth() !== targetMonth % 12) {
      // If we overflowed, set to the last day of the target month
      result.setDate(0);
    }

    return result;
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);

    // Handle leap year edge case (Feb 29 -> Feb 28 in non-leap years)
    if (result.getMonth() !== date.getMonth()) {
      result.setDate(0);
    }

    return result;
  }
}
