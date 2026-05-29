import { InvalidDateRangeError } from './usage.errors';
import { UsageConstants } from '../domain/value-objects/usage.constants';
import { ModelDistribution } from '../domain/model-distribution.entity';
import { ProviderUsage } from '../domain/provider-usage.entity';

/**
 * Validates that both startDate and endDate are provided together (or neither),
 * and if both are present, validates the range.
 * @throws InvalidDateRangeError if only one is provided or the range is invalid
 */
export function validateOptionalDateRange(
  startDate?: Date,
  endDate?: Date,
): void {
  const hasStart = startDate !== undefined;
  const hasEnd = endDate !== undefined;
  if (hasStart !== hasEnd) {
    throw new InvalidDateRangeError(
      'Both startDate and endDate must be provided, or neither',
    );
  }
  if (startDate && endDate) {
    validateDateRange(startDate, endDate);
  }
}

/**
 * Validates that a date range is valid for usage queries.
 * @throws InvalidDateRangeError if the date range is invalid
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
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
    throw new InvalidDateRangeError(`Date range cannot exceed ${maxDays} days`);
  }
}

/**
 * Processes model distribution data by calculating percentages and sorting by credit usage.
 * @param modelDistribution Raw model distribution data
 * @param maxModels Maximum number of models to return (0 or negative for no limit)
 * @returns Processed model distribution with percentages, sorted by credit usage descending
 */
export function processModelDistribution(
  modelDistribution: ModelDistribution[],
  maxModels: number,
): ModelDistribution[] {
  const totalCredits = modelDistribution.reduce(
    (sum, model) => sum + model.credits,
    0,
  );

  if (totalCredits === 0) {
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
          credits: model.credits,
          requests: model.requests,
          percentage: (model.credits / totalCredits) * 100,
        }),
    )
    .sort((a, b) => b.credits - a.credits);

  return maxModels > 0 ? sortedModels.slice(0, maxModels) : sortedModels;
}

/**
 * Calculates percentage distribution for provider usage data.
 * @param providerUsage Raw provider usage data
 * @returns Provider usage data with calculated percentages
 */
export function calculateProviderPercentages(
  providerUsage: ProviderUsage[],
): ProviderUsage[] {
  const totalCredits = providerUsage.reduce(
    (sum, provider) => sum + provider.credits,
    0,
  );

  return providerUsage.map((provider) => {
    const percentage =
      totalCredits > 0 ? (provider.credits / totalCredits) * 100 : 0;

    return new ProviderUsage({
      provider: provider.provider,
      credits: provider.credits,
      requests: provider.requests,
      percentage,
      timeSeriesData: provider.timeSeriesData,
    });
  });
}
