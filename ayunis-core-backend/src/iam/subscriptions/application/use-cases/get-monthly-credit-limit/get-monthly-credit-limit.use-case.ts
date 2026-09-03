import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditLimitQuery } from './get-monthly-credit-limit.query';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { isUsageBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSubscriptionError } from 'src/iam/subscriptions/application/subscription.errors';

/**
 * Returns the monthly credit limit for an organization's active usage-based
 * subscription, or null if no such subscription exists.
 */
@Injectable()
export class GetMonthlyCreditLimitUseCase {
  private readonly logger = new Logger(GetMonthlyCreditLimitUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(
    query: GetMonthlyCreditLimitQuery,
  ): Promise<{ monthlyCredits: number | null; startsAt: Date | null }> {
    try {
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      const usageSubscription = subscriptions
        .filter(isActive)
        .find(isUsageBased);

      if (!usageSubscription) {
        this.logger.debug(
          {
            orgId: query.orgId,
          },
          'No active usage-based subscription found',
        );
        return { monthlyCredits: null, startsAt: null };
      }

      return {
        monthlyCredits: usageSubscription.monthlyCredits,
        startsAt: usageSubscription.startsAt,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to get monthly credit limit',
      );
      throw new UnexpectedSubscriptionError((error as Error).message, {
        orgId: query.orgId,
      });
    }
  }
}
