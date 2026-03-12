import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditLimitQuery } from './get-monthly-credit-limit.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { isActive } from '../../util/is-active';
import { isUsageBased } from '../../../domain/subscription-type-guards';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSubscriptionError } from '../../subscription.errors';

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
  ): Promise<{ monthlyCredits: number | null }> {
    try {
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      const usageSubscription = subscriptions
        .filter(isActive)
        .find(isUsageBased);

      if (!usageSubscription) {
        this.logger.debug('No active usage-based subscription found', {
          orgId: query.orgId,
        });
        return { monthlyCredits: null };
      }

      return { monthlyCredits: usageSubscription.monthlyCredits };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get monthly credit limit', error);
      throw new UnexpectedSubscriptionError((error as Error).message, {
        orgId: query.orgId,
      });
    }
  }
}
