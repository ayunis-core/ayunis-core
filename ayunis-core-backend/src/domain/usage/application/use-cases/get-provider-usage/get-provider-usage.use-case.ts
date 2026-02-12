import { Injectable } from '@nestjs/common';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  validateDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';

@Injectable()
export class GetProviderUsageUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    if (query.startDate && query.endDate) {
      validateDateRange(query.startDate, query.endDate);
    }

    const providerUsage = await this.usageRepository.getProviderUsage(query);

    return calculateProviderPercentages(providerUsage);
  }
}
