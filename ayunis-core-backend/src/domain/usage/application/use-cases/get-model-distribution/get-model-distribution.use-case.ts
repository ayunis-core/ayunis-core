import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetModelDistributionQuery } from './get-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetModelDistributionUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    const isSelfHosted = this.configService.get<boolean>(
      'app.isSelfHosted',
      false,
    );

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

    // Calculate percentages, group less-used models, and apply cost visibility
    return this.processModelDistribution(
      modelDistribution,
      query.maxModels,
      isSelfHosted,
    );
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
    isSelfHosted: boolean,
  ): ModelDistribution[] {
    const totalTokens = modelDistribution.reduce(
      (sum, model) => sum + model.tokens,
      0,
    );

    if (totalTokens === 0) {
      return [];
    }

    // Sort by token usage (descending)
    const sortedModels = modelDistribution
      .map(
        (model) =>
          new ModelDistribution(
            model.modelId,
            model.modelName,
            model.displayName,
            model.provider,
            model.tokens,
            model.requests,
            isSelfHosted ? model.cost : undefined,
            (model.tokens / totalTokens) * 100,
          ),
      )
      .sort((a, b) => b.tokens - a.tokens);

    // If we have fewer models than the limit, return all
    if (sortedModels.length <= maxModels) {
      return sortedModels;
    }

    const topModels = sortedModels.slice(0, maxModels - 1);
    const otherModels = sortedModels.slice(maxModels - 1);

    // Calculate "Others" aggregation
    const othersTokens = otherModels.reduce(
      (sum, model) => sum + model.tokens,
      0,
    );
    const othersRequests = otherModels.reduce(
      (sum, model) => sum + model.requests,
      0,
    );
    const othersCost = otherModels.reduce(
      (sum, model) => sum + (model.cost || 0),
      0,
    );

    const othersPercentage = (othersTokens / totalTokens) * 100;
    const othersEntry = new ModelDistribution(
      UsageConstants.OTHERS_MODEL_ID,
      'Others',
      `Others (${otherModels.length} models)`,
      otherModels[0]?.provider || ('mixed' as unknown as any),
      othersTokens,
      othersRequests,
      isSelfHosted && othersCost > 0 ? othersCost : undefined,
      othersPercentage,
    );

    return [...topModels, othersEntry];
  }
}
