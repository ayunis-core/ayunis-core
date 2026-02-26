import { Injectable } from '@nestjs/common';
import { GetGlobalProviderUsageQuery } from './get-global-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';

@Injectable()
export class GetGlobalProviderUsageUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetGlobalProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    const providerUsage =
      await this.usageRepository.getGlobalProviderUsage(query);

    return calculateProviderPercentages(providerUsage);
  }
}
