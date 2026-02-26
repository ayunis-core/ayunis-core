import { Injectable } from '@nestjs/common';
import { GetModelDistributionQuery } from './get-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import {
  validateOptionalDateRange,
  processModelDistribution,
} from '../../usage.utils';

@Injectable()
export class GetModelDistributionUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    const modelDistribution = await this.usageRepository.getModelDistribution({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
      maxModels: query.maxModels,
      modelId: query.modelId,
    });

    return processModelDistribution(modelDistribution, query.maxModels);
  }
}
