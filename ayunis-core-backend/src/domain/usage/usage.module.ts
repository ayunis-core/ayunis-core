import { Module } from '@nestjs/common';
import { CollectUsageUseCase } from './application/use-cases/collect-usage/collect-usage.use-case';
import { GetProviderUsageUseCase } from './application/use-cases/get-provider-usage/get-provider-usage.use-case';
import { GetModelDistributionUseCase } from './application/use-cases/get-model-distribution/get-model-distribution.use-case';
import { GetGlobalProviderUsageUseCase } from './application/use-cases/get-global-provider-usage/get-global-provider-usage.use-case';
import { GetGlobalModelDistributionUseCase } from './application/use-cases/get-global-model-distribution/get-global-model-distribution.use-case';
import { GetGlobalUserUsageUseCase } from './application/use-cases/get-global-user-usage/get-global-user-usage.use-case';
import { GetUserUsageUseCase } from './application/use-cases/get-user-usage/get-user-usage.use-case';
import { GetUsageStatsUseCase } from './application/use-cases/get-usage-stats/get-usage-stats.use-case';
import { UsageController } from './presenters/http/usage.controller';
import { SuperAdminUsageController } from './presenters/http/super-admin-usage.controller';
import { SuperAdminUsageDataController } from './presenters/http/super-admin-usage-data.controller';
import { SuperAdminGlobalUsageController } from './presenters/http/super-admin-global-usage.controller';
import { LocalUsageRepositoryModule } from './infrastructure/persistence/local-usage/local-usage-repository.module';
import { UsageStatsResponseDtoMapper } from './presenters/http/mappers/usage-stats-response-dto.mapper';
import { ProviderUsageResponseDtoMapper } from './presenters/http/mappers/provider-usage-response-dto.mapper';
import { ProviderUsageChartResponseDtoMapper } from './presenters/http/mappers/provider-usage-chart-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './presenters/http/mappers/model-distribution-response-dto.mapper';
import { UserUsageResponseDtoMapper } from './presenters/http/mappers/user-usage-response-dto.mapper';
import { GlobalUserUsageResponseDtoMapper } from './presenters/http/mappers/global-user-usage-response-dto.mapper';
import { SuperAdminGlobalUsageResponseMapper } from './presenters/http/mappers/super-admin-global-usage-response.mapper';
import { UsageResponseMapper } from './presenters/http/mappers/usage-response.mapper';
import { UsageUseCasesFacade } from './presenters/http/usage-use-cases.facade';

@Module({
  imports: [LocalUsageRepositoryModule],
  controllers: [
    UsageController,
    SuperAdminUsageController,
    SuperAdminUsageDataController,
    SuperAdminGlobalUsageController,
  ],
  providers: [
    // Use Cases
    CollectUsageUseCase,
    GetProviderUsageUseCase,
    GetModelDistributionUseCase,
    GetGlobalProviderUsageUseCase,
    GetGlobalModelDistributionUseCase,
    GetGlobalUserUsageUseCase,
    GetUserUsageUseCase,
    GetUsageStatsUseCase,

    // Mappers
    UsageStatsResponseDtoMapper,
    ProviderUsageResponseDtoMapper,
    ProviderUsageChartResponseDtoMapper,
    ModelDistributionResponseDtoMapper,
    UserUsageResponseDtoMapper,
    GlobalUserUsageResponseDtoMapper,
    SuperAdminGlobalUsageResponseMapper,
    UsageResponseMapper,
    UsageUseCasesFacade,
  ],
  exports: [
    CollectUsageUseCase,
    GetProviderUsageUseCase,
    GetModelDistributionUseCase,
    GetGlobalProviderUsageUseCase,
    GetGlobalModelDistributionUseCase,
    GetGlobalUserUsageUseCase,
    GetUserUsageUseCase,
    GetUsageStatsUseCase,
  ],
})
export class UsageModule {}
