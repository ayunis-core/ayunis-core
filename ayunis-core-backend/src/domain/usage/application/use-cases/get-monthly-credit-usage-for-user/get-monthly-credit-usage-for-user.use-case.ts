import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetMonthlyCreditUsageForUserQuery } from './get-monthly-credit-usage-for-user.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUserUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetMonthlyCreditUsageForUserUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    query: GetMonthlyCreditUsageForUserQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
      {
        userId: query.userId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for user',
    );

    try {
      const creditsUsed =
        await this.usageRepository.getTotalMonthlyCreditUsageForUser(
          query.organizationId,
          query.userId,
          effectiveStart,
        );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage for user',
      );
      throw new UnexpectedUsageError(error as Error, {
        userId: query.userId,
      });
    }
  }
}
