import { Injectable } from '@nestjs/common';
import { ProviderUsageChartResponseDtoMapper } from './provider-usage-chart-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './model-distribution-response-dto.mapper';
import { GlobalUserUsageResponseDtoMapper } from './global-user-usage-response-dto.mapper';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import { ProviderUsageChartResponseDto } from '../dto/provider-usage-chart-response.dto';
import { ModelDistributionResponseDto } from '../dto/model-distribution-response.dto';
import { GlobalUserUsageResponseDto } from '../dto/global-user-usage-response.dto';

@Injectable()
export class SuperAdminGlobalUsageResponseMapper {
  constructor(
    private readonly providerUsageChartMapper: ProviderUsageChartResponseDtoMapper,
    private readonly modelDistributionMapper: ModelDistributionResponseDtoMapper,
    private readonly globalUserUsageMapper: GlobalUserUsageResponseDtoMapper,
  ) {}

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

  toGlobalUserUsageDto(
    items: GlobalUserUsageItem[],
  ): GlobalUserUsageResponseDto {
    return this.globalUserUsageMapper.toDto(items);
  }
}
