import { Injectable } from '@nestjs/common';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { BillingCycle } from 'src/iam/subscriptions/domain/value-objects/billing-cycle.enum';

@Injectable()
export class HasActiveSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(query: HasActiveSubscriptionQuery): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findByOrgId(
      query.orgId,
    );
    if (!subscription) {
      return false;
    }

    if (subscription.cancelledAt) {
      const lastBillingDate = this.getLastBillingDate(
        subscription.cancelledAt,
        subscription.billingCycle,
        subscription.billingCycleAnchor,
      );

      // If we're past the last billing date, subscription is no longer active
      if (new Date() >= lastBillingDate) {
        return false;
      }
    }

    return true;
  }

  private getLastBillingDate(
    cancelledAt: Date,
    billingCycle: BillingCycle,
    billingCycleAnchor: Date,
  ): Date {
    let nextBillingDate = new Date(billingCycleAnchor);

    // If the anchor is already after cancellation, return it
    if (nextBillingDate > cancelledAt) {
      return nextBillingDate;
    }

    // Calculate the next billing date after cancellation
    while (nextBillingDate <= cancelledAt) {
      if (billingCycle === BillingCycle.MONTHLY) {
        nextBillingDate = this.addMonths(nextBillingDate, 1);
      } else if (billingCycle === BillingCycle.YEARLY) {
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
