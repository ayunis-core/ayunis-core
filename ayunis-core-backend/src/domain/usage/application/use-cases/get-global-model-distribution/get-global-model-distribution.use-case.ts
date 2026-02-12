import { Injectable } from '@nestjs/common';
import { GetGlobalModelDistributionQuery } from './get-global-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetGlobalModelDistributionUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetGlobalModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    if (query.startDate && query.endDate) {
      this.validateDateRange(query.startDate, query.endDate);
    }

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    const modelDistribution =
      await this.usageRepository.getGlobalModelDistribution(query);

    return this.processModelDistribution(modelDistribution, query.maxModels);
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new InvalidDateRangeError('Start date cannot be after end date');
    }

    const now = new Date();
    if (startDate > now) {
      throw new InvalidDateRangeError('Start date cannot be in the future');
    }

    const maxDays = UsageConstants.MAX_DATE_RANGE_DAYS;
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > maxDays) {
      throw new InvalidDateRangeError(
        `Date range cannot exceed ${maxDays} days`,
      );
    }
  }

  private processModelDistribution(
    modelDistribution: ModelDistribution[],
    maxModels: number,
  ): ModelDistribution[] {
    const totalTokens = modelDistribution.reduce(
      (sum, model) => sum + model.tokens,
      0,
    );

    if (totalTokens === 0) {
      return [];
    }

    const sortedModels = modelDistribution
      .map(
        (model) =>
          new ModelDistribution({
            modelId: model.modelId,
            modelName: model.modelName,
            displayName: model.displayName,
            provider: model.provider,
            tokens: model.tokens,
            requests: model.requests,
            percentage: (model.tokens / totalTokens) * 100,
          }),
      )
      .sort((a, b) => b.tokens - a.tokens);

    return maxModels > 0 ? sortedModels.slice(0, maxModels) : sortedModels;
  }
}
