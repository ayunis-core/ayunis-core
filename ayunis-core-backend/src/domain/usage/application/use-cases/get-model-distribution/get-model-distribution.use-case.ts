import { Injectable } from '@nestjs/common';
import { GetModelDistributionQuery } from './get-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetModelDistributionUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    if (query.startDate && query.endDate) {
      this.validateDateRange(query.startDate, query.endDate);
    }

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

    // Calculate percentages and group less-used models
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

    // Check if date range is reasonable (guard against heavy queries)
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

    // Sort by token usage (descending) and calculate percentages
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

    // Apply limit if specified (frontend can decide how to handle aggregation)
    return maxModels > 0 ? sortedModels.slice(0, maxModels) : sortedModels;
  }
}
