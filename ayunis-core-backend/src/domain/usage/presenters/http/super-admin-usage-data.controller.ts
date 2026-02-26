import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProviderUsageResponseDto } from './dto/provider-usage-response.dto';
import { ProviderUsageChartResponseDto } from './dto/provider-usage-chart-response.dto';
import { UserUsageResponseDto } from './dto/user-usage-response.dto';
import { ProviderUsageResponseDtoMapper } from './mappers/provider-usage-response-dto.mapper';
import { ProviderUsageChartResponseDtoMapper } from './mappers/provider-usage-chart-response-dto.mapper';
import { UserUsageResponseDtoMapper } from './mappers/user-usage-response-dto.mapper';
import { parseDate } from './utils/parse-date.util';
import { UUID } from 'crypto';
import { ModelProvider } from '../../../models/domain/value-objects/model-provider.enum';
import { GetProviderUsageUseCase } from '../../application/use-cases/get-provider-usage/get-provider-usage.use-case';
import { GetUserUsageUseCase } from '../../application/use-cases/get-user-usage/get-user-usage.use-case';
import { GetProviderUsageQuery } from '../../application/use-cases/get-provider-usage/get-provider-usage.query';
import {
  GetUserUsageQuery,
  UserUsageSortBy,
  SortOrder,
} from '../../application/use-cases/get-user-usage/get-user-usage.query';
import { UsageConstants } from '../../domain/value-objects/usage.constants';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Usage')
@Controller('super-admin/usage')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUsageDataController {
  constructor(
    private readonly getProviderUsageUseCase: GetProviderUsageUseCase,
    private readonly getUserUsageUseCase: GetUserUsageUseCase,
    private readonly providerUsageMapper: ProviderUsageResponseDtoMapper,
    private readonly userUsageMapper: UserUsageResponseDtoMapper,
    private readonly providerUsageChartMapper: ProviderUsageChartResponseDtoMapper,
  ) {}

  @Get(':orgId/providers')
  @ApiOperation({
    summary: 'Get usage statistics by provider for an organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProviderUsageResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'includeTimeSeries', type: Boolean, required: false })
  @ApiQuery({ name: 'provider', type: String, required: false })
  @ApiQuery({ name: 'modelId', type: String, required: false })
  async getProviderUsage(
    @Param('orgId') orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeTimeSeries') includeTimeSeries: boolean = true,
    @Query('provider') provider?: string,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetProviderUsageQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
      includeTimeSeriesData: includeTimeSeries,
      provider: provider as ModelProvider | undefined,
      modelId: modelId as UUID | undefined,
    });
    const providerUsage = await this.getProviderUsageUseCase.execute(query);
    return this.providerUsageMapper.toDto(providerUsage);
  }

  @Get(':orgId/providers/chart')
  @ApiOperation({
    summary: 'Get provider usage time series for an organization (chart-ready)',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProviderUsageChartResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'provider', type: String, required: false })
  @ApiQuery({ name: 'modelId', type: String, required: false })
  async getProviderUsageChart(
    @Param('orgId') orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('provider') provider?: string,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetProviderUsageQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
      includeTimeSeriesData: true,
      provider: provider as ModelProvider | undefined,
      modelId: modelId as UUID | undefined,
    });
    const providerUsage = await this.getProviderUsageUseCase.execute(query);
    return this.providerUsageChartMapper.toDto(providerUsage);
  }

  @Get(':orgId/users')
  @ApiOperation({ summary: 'Get usage statistics by user for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserUsageResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({
    name: 'sortBy',
    enum: ['tokens', 'requests', 'lastActivity', 'userName'],
    required: false,
  })
  @ApiQuery({ name: 'sortOrder', enum: ['asc', 'desc'], required: false })
  async getUserUsage(
    @Param('orgId') orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = UsageConstants.DEFAULT_USER_USAGE_LIMIT,
    @Query('offset') offset: number = 0,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: UserUsageSortBy = 'tokens',
    @Query('sortOrder') sortOrder: SortOrder = 'desc',
  ) {
    const query = new GetUserUsageQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
      limit,
      offset,
      searchTerm: search,
      sortBy,
      sortOrder,
    });
    const userUsage = await this.getUserUsageUseCase.execute(query);
    return this.userUsageMapper.toDto(userUsage);
  }
}
