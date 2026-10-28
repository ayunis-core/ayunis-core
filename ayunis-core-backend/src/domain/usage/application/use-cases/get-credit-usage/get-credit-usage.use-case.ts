import { Injectable, Logger } from '@nestjs/common';
import { GetCreditUsageQuery } from './get-credit-usage.query';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import type { CreditUsage } from 'src/domain/usage/domain/credit-usage';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetCreditUsageUseCase {
  private readonly logger = new Logger(GetCreditUsageUseCase.name);

  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
  ) {}

  async execute(query: GetCreditUsageQuery): Promise<CreditUsage> {
    this.logger.log({ orgId: query.orgId }, 'Getting credit usage');

    try {
      const { monthlyCredits, startsAt } =
        await this.getMonthlyCreditLimitUseCase.execute(
          new GetMonthlyCreditLimitQuery(query.orgId),
        );

      const { creditsUsed } = await this.getMonthlyCreditUsageUseCase.execute(
        new GetMonthlyCreditUsageQuery(query.orgId, startsAt ?? undefined),
      );

      const creditsRemaining =
        monthlyCredits !== null
          ? Math.max(0, monthlyCredits - creditsUsed)
          : null;

      return { monthlyCredits, creditsUsed, creditsRemaining };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get credit usage',
      );
      throw new UnexpectedUsageError(error as Error, {
        orgId: query.orgId,
      });
    }
  }
}
