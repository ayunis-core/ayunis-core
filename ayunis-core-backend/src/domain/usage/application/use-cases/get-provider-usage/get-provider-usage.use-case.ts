import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';

@Injectable()
export class GetProviderUsageUseCase {
  private readonly logger = new Logger(GetProviderUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log('Getting provider usage', {
      organizationId: query.organizationId,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

    const providerUsage = await this.usageRepository.getProviderUsage(query);
    return calculateProviderPercentages(providerUsage);
  }
}
