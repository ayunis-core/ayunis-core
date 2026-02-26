import { Injectable } from '@nestjs/common';
import { UsageStatsResponseDtoMapper } from './usage-stats-response-dto.mapper';
import { ProviderUsageResponseDtoMapper } from './provider-usage-response-dto.mapper';
import { ProviderUsageChartResponseDtoMapper } from './provider-usage-chart-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './model-distribution-response-dto.mapper';
import { UserUsageResponseDtoMapper } from './user-usage-response-dto.mapper';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import { Paginated } from 'src/common/pagination';
import { UsageStatsResponseDto } from '../dto/usage-stats-response.dto';
import { ProviderUsageResponseDto } from '../dto/provider-usage-response.dto';
import { ProviderUsageChartResponseDto } from '../dto/provider-usage-chart-response.dto';
import { ModelDistributionResponseDto } from '../dto/model-distribution-response.dto';
import { UserUsageResponseDto } from '../dto/user-usage-response.dto';

@Injectable()
export class UsageResponseMapper {
  constructor(
    private readonly usageStatsMapper: UsageStatsResponseDtoMapper,
    private readonly providerUsageMapper: ProviderUsageResponseDtoMapper,
    private readonly providerUsageChartMapper: ProviderUsageChartResponseDtoMapper,
    private readonly modelDistributionMapper: ModelDistributionResponseDtoMapper,
    private readonly userUsageMapper: UserUsageResponseDtoMapper,
  ) {}

  toUsageStatsDto(stats: UsageStats): UsageStatsResponseDto {
    return this.usageStatsMapper.toDto(stats);
  }

  toProviderUsageDto(providerUsage: ProviderUsage[]): ProviderUsageResponseDto {
    return this.providerUsageMapper.toDto(providerUsage);
  }

  toProviderUsageChartDto(
    providerUsage: ProviderUsage[],
  ): ProviderUsageChartResponseDto {
    return this.providerUsageChartMapper.toDto(providerUsage);
  }

  toModelDistributionDto(
    modelDistribution: ModelDistribution[],
  ): ModelDistributionResponseDto {
    return this.modelDistributionMapper.toDto(modelDistribution);
  }

  toUserUsageDto(userUsage: Paginated<UserUsageItem>): UserUsageResponseDto {
    return this.userUsageMapper.toDto(userUsage);
  }
}
