import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';
import { GetMonthlyCreditUsageForApiKeyQuery } from './get-monthly-credit-usage-for-api-key.query';

@Injectable()
export class GetMonthlyCreditUsageForApiKeyUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetMonthlyCreditUsageForApiKeyUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForApiKeyQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
      {
        apiKeyId: query.apiKeyId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for API key',
    );

    const creditsUsed =
      await this.usageRepository.getTotalMonthlyCreditUsageForApiKey(
        query.organizationId,
        query.apiKeyId,
        effectiveStart,
      );

    return { creditsUsed };
  }
}
