import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
    @InjectPinoLogger(CreditBudgetGuardService.name)
    private readonly logger: PinoLogger,
  ) {}

  async ensureBudgetAvailable(orgId: UUID): Promise<void> {
    const { monthlyCredits, startsAt } =
      await this.getMonthlyCreditLimitUseCase.execute(
        new GetMonthlyCreditLimitQuery(orgId),
      );

    if (monthlyCredits === null) {
      return;
    }

    const { creditsUsed } = await this.getMonthlyCreditUsageUseCase.execute(
      new GetMonthlyCreditUsageQuery(orgId, startsAt ?? undefined),
    );

    if (creditsUsed >= monthlyCredits) {
      this.logger.warn(
        {
          orgId,
          creditsUsed,
          monthlyCredits,
        },
        'Credit budget exceeded',
      );
      throw new CreditBudgetExceededError({
        orgId,
        creditsUsed,
        monthlyCredits,
      });
    }
  }
}
