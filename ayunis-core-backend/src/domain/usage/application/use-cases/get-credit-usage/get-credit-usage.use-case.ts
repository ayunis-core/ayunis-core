import { Injectable, Logger } from '@nestjs/common';
import { GetCreditUsageQuery } from './get-credit-usage.query';
import { GetMonthlyCreditUsageUseCase } from '../get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from '../get-monthly-credit-usage/get-monthly-credit-usage.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import type { CreditUsage } from '../../../domain/credit-usage';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetCreditUsageUseCase {
  private readonly logger = new Logger(GetCreditUsageUseCase.name);

  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
  ) {}

  async execute(query: GetCreditUsageQuery): Promise<CreditUsage> {
    this.logger.log('Getting credit usage', { orgId: query.orgId });

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
      this.logger.error('Failed to get credit usage', error);
      throw new UnexpectedUsageError(error as Error, {
        orgId: query.orgId,
      });
    }
  }
}
