import { Injectable } from '@nestjs/common';
import { GetGlobalModelDistributionQuery } from './get-global-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import {
  validateOptionalDateRange,
  processModelDistribution,
} from '../../usage.utils';

@Injectable()
export class GetGlobalModelDistributionUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetGlobalModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    const modelDistribution =
      await this.usageRepository.getGlobalModelDistribution(query);

    return processModelDistribution(modelDistribution, query.maxModels);
  }
}
