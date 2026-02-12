import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProviderUsageChartResponseDto } from './dto/provider-usage-chart-response.dto';
import { ModelDistributionResponseDto } from './dto/model-distribution-response.dto';
import { ProviderUsageChartResponseDtoMapper } from './mappers/provider-usage-chart-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './mappers/model-distribution-response-dto.mapper';
import { UUID } from 'crypto';
import { ModelProvider } from '../../../models/domain/value-objects/model-provider.enum';
import { GetGlobalProviderUsageUseCase } from '../../application/use-cases/get-global-provider-usage/get-global-provider-usage.use-case';
import { GetGlobalModelDistributionUseCase } from '../../application/use-cases/get-global-model-distribution/get-global-model-distribution.use-case';
import { GetGlobalProviderUsageQuery } from '../../application/use-cases/get-global-provider-usage/get-global-provider-usage.query';
import { GetGlobalModelDistributionQuery } from '../../application/use-cases/get-global-model-distribution/get-global-model-distribution.query';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Global Usage')
@Controller('super-admin/global-usage')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminGlobalUsageController {
  constructor(
    private readonly getGlobalProviderUsageUseCase: GetGlobalProviderUsageUseCase,
    private readonly getGlobalModelDistributionUseCase: GetGlobalModelDistributionUseCase,
    private readonly providerUsageChartMapper: ProviderUsageChartResponseDtoMapper,
    private readonly modelDistributionMapper: ModelDistributionResponseDtoMapper,
  ) {}

  @Get('providers/chart')
  @ApiOperation({
    summary:
      'Get global provider usage time series across all organizations (chart-ready)',
  })
  @ApiResponse({ status: 200, type: ProviderUsageChartResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'provider', type: String, required: false })
  @ApiQuery({ name: 'modelId', type: String, required: false })
  async getGlobalProviderUsageChart(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('provider') provider?: string,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetGlobalProviderUsageQuery({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeTimeSeriesData: true,
      provider: provider as ModelProvider | undefined,
      modelId: modelId as UUID | undefined,
    });
    const providerUsage =
      await this.getGlobalProviderUsageUseCase.execute(query);
    return this.providerUsageChartMapper.toDto(providerUsage);
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get global model distribution across all organizations',
  })
  @ApiResponse({ status: 200, type: ModelDistributionResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'modelId', type: String, required: false })
  async getGlobalModelDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetGlobalModelDistributionQuery({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      modelId: modelId as UUID | undefined,
    });
    const modelDistribution =
      await this.getGlobalModelDistributionUseCase.execute(query);
    return this.modelDistributionMapper.toDto(modelDistribution);
  }
}
