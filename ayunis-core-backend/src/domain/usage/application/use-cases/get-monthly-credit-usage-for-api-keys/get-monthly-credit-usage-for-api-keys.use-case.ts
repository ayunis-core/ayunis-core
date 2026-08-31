import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';
import { GetMonthlyCreditUsageForApiKeysQuery } from './get-monthly-credit-usage-for-api-keys.query';

@Injectable()
export class GetMonthlyCreditUsageForApiKeysUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetMonthlyCreditUsageForApiKeysUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForApiKeysQuery,
  ): Promise<Map<UUID, number>> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
      {
        apiKeyCount: query.apiKeyIds.length,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for API keys',
    );

    return await this.usageRepository.getMonthlyCreditUsagePerApiKey(
      query.organizationId,
      query.apiKeyIds,
      effectiveStart,
    );
  }
}
