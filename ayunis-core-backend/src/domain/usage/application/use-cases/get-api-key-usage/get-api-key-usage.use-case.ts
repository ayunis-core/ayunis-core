import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { validateOptionalDateRange } from 'src/domain/usage/application/usage.utils';
import type { ApiKeyUsageItem } from 'src/domain/usage/domain/api-key-usage-item.entity';
import { GetApiKeyUsageQuery } from './get-api-key-usage.query';

@Injectable()
export class GetApiKeyUsageUseCase {
  private readonly logger = new Logger(GetApiKeyUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetApiKeyUsageQuery): Promise<ApiKeyUsageItem[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log(
      {
        organizationId: query.organizationId,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
      },
      'Getting API key usage',
    );

    return await this.usageRepository.getApiKeyUsage({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
