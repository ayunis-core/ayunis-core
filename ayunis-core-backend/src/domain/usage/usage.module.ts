import { Module } from '@nestjs/common';
import { CollectUsageUseCase } from './application/use-cases/collect-usage/collect-usage.use-case';
import { GetProviderUsageUseCase } from './application/use-cases/get-provider-usage/get-provider-usage.use-case';
import { GetModelDistributionUseCase } from './application/use-cases/get-model-distribution/get-model-distribution.use-case';
import { GetUserUsageUseCase } from './application/use-cases/get-user-usage/get-user-usage.use-case';
import { GetUsageStatsUseCase } from './application/use-cases/get-usage-stats/get-usage-stats.use-case';
import { UsageController } from './presenters/http/usage.controller';
import { LocalUsageRepositoryModule } from './infrastructure/persistence/local-usage/local-usage-repository.module';
import { UsageStatsResponseDtoMapper } from './presenters/http/mappers/usage-stats-response-dto.mapper';
import { ProviderUsageResponseDtoMapper } from './presenters/http/mappers/provider-usage-response-dto.mapper';
import { ProviderUsageChartResponseDtoMapper } from './presenters/http/mappers/provider-usage-chart-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './presenters/http/mappers/model-distribution-response-dto.mapper';
import { UserUsageResponseDtoMapper } from './presenters/http/mappers/user-usage-response-dto.mapper';

@Module({
  imports: [LocalUsageRepositoryModule],
  controllers: [UsageController],
  providers: [
    // Use Cases
    CollectUsageUseCase,
    GetProviderUsageUseCase,
    GetModelDistributionUseCase,
    GetUserUsageUseCase,
    GetUsageStatsUseCase,

    // Mappers
    UsageStatsResponseDtoMapper,
    ProviderUsageResponseDtoMapper,
    ProviderUsageChartResponseDtoMapper,
    ModelDistributionResponseDtoMapper,
    UserUsageResponseDtoMapper,
  ],
  exports: [
    CollectUsageUseCase,
    GetProviderUsageUseCase,
    GetModelDistributionUseCase,
    GetUserUsageUseCase,
    GetUsageStatsUseCase,
  ],
})
export class UsageModule {}
