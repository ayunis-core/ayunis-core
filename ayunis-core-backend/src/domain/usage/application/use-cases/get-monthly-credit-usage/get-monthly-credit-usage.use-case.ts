import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetMonthlyCreditUsageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    query: GetMonthlyCreditUsageQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
      {
        orgId: query.orgId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage',
    );

    try {
      const creditsUsed = await this.usageRepository.getMonthlyCreditUsage(
        query.orgId,
        effectiveStart,
      );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage',
      );
      throw new UnexpectedUsageError(error as Error, {
        orgId: query.orgId,
        effectiveStart: effectiveStart.toISOString(),
      });
    }
  }
}
