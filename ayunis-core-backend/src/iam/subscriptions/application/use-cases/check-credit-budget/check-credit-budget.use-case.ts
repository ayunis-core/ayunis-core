import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { isUsageBased } from '../../../domain/subscription-type-guards';
import { isActive } from '../../util/is-active';
import { GetMonthlyCreditUsageUseCase } from '../../../../../domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from '../../../../../domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import { CreditBudgetExceededError } from '../../subscription.errors';
import { CheckCreditBudgetQuery } from './check-credit-budget.query';

@Injectable()
export class CheckCreditBudgetUseCase {
  private readonly logger = new Logger(CheckCreditBudgetUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
  ) {}

  async execute(query: CheckCreditBudgetQuery): Promise<void> {
    const subscriptions = await this.subscriptionRepository.findByOrgId(
      query.orgId,
    );
    const activeSubscription = subscriptions.find(
      (s) => isActive(s) && isUsageBased(s),
    );

    if (!activeSubscription || !isUsageBased(activeSubscription)) {
      return;
    }

    const { creditsUsed } = await this.getMonthlyCreditUsageUseCase.execute(
      new GetMonthlyCreditUsageQuery(query.orgId),
    );

    if (creditsUsed >= activeSubscription.monthlyCredits) {
      this.logger.warn('Credit budget exceeded', {
        orgId: query.orgId,
        creditsUsed,
        monthlyCredits: activeSubscription.monthlyCredits,
      });
      throw new CreditBudgetExceededError({
        orgId: query.orgId,
        creditsUsed,
        monthlyCredits: activeSubscription.monthlyCredits,
      });
    }
  }
}
