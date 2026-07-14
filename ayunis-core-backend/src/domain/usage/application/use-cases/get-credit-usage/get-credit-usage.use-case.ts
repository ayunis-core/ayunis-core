import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetCreditUsageQuery } from './get-credit-usage.query';
import { GetMonthlyCreditUsageUseCase } from '../get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from '../get-monthly-credit-usage/get-monthly-credit-usage.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import type { CreditUsage } from '../../../domain/credit-usage';
import { UnexpectedUsageError } from '../../usage.errors';

@Injectable()
export class GetCreditUsageUseCase {
  private readonly logger = new Logger(GetCreditUsageUseCase.name);

  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetCreditUsageQuery): Promise<CreditUsage> {
    this.logger.log('Getting credit usage', { orgId: query.orgId });

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
  }
}
