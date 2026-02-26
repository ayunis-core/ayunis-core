import { Injectable } from '@nestjs/common';
import { GetGlobalUserUsageQuery } from './get-global-user-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import { validateOptionalDateRange } from '../../usage.utils';

@Injectable()
export class GetGlobalUserUsageUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetGlobalUserUsageQuery,
  ): Promise<GlobalUserUsageItem[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    return this.usageRepository.getGlobalUserUsage(query);
  }
}
