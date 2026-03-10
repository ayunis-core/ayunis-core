import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';

/**
 * Orchestrates a credit-budget check by combining data from the
 * subscriptions domain (monthly credit limit) and the usage domain
 * (credits consumed this month).
 *
 * Lives in the runs module because it is the run execution flow that
 * needs this cross-domain decision — neither subscriptions nor usage
 * should depend on each other.
 */
@Injectable()
export class CreditBudgetGuardService {
  private readonly logger = new Logger(CreditBudgetGuardService.name);

  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
  ) {}

  async ensureBudgetAvailable(orgId: UUID): Promise<void> {
    const { monthlyCredits } = await this.getMonthlyCreditLimitUseCase.execute(
      new GetMonthlyCreditLimitQuery(orgId),
    );

    if (monthlyCredits === null) {
      return;
    }

    const { creditsUsed } = await this.getMonthlyCreditUsageUseCase.execute(
      new GetMonthlyCreditUsageQuery(orgId),
    );

    if (creditsUsed >= monthlyCredits) {
      this.logger.warn('Credit budget exceeded', {
        orgId,
        creditsUsed,
        monthlyCredits,
      });
      throw new CreditBudgetExceededError({
        orgId,
        creditsUsed,
        monthlyCredits,
      });
    }
  }
}
