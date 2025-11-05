import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../../domain/time-series-point.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetProviderUsageUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    const isSelfHosted = this.configService.get<boolean>(
      'app.isSelfHosted',
      false,
    );

    if (query.startDate && query.endDate) {
      this.validateDateRange(query.startDate, query.endDate);
    }

    const providerUsage = await this.usageRepository.getProviderUsage(query);

    const totalTokens = providerUsage.reduce(
      (sum, provider) => sum + provider.tokens,
      0,
    );

    return providerUsage.map((provider) => {
      const percentage =
        totalTokens > 0 ? (provider.tokens / totalTokens) * 100 : 0;

      if (!isSelfHosted) {
        const timeSeriesWithoutCost = provider.timeSeriesData.map(
          (point) =>
            new TimeSeriesPoint(
              point.date,
              point.tokens,
              point.requests,
              undefined,
            ),
        );

        return new ProviderUsage(
          provider.provider,
          provider.tokens,
          provider.requests,
          undefined,
          percentage,
          timeSeriesWithoutCost,
        );
      }

      return new ProviderUsage(
        provider.provider,
        provider.tokens,
        provider.requests,
        provider.cost,
        percentage,
        provider.timeSeriesData,
      );
    });
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
}
