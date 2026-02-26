import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsageStatsResponseDto } from './dto/usage-stats-response.dto';
import { ProviderUsageResponseDto } from './dto/provider-usage-response.dto';
import { ProviderUsageChartResponseDto } from './dto/provider-usage-chart-response.dto';
import { ModelDistributionResponseDto } from './dto/model-distribution-response.dto';
import { UserUsageResponseDto } from './dto/user-usage-response.dto';
import { UsageConfigResponseDto } from './dto/usage-config-response.dto';
import { UsageResponseMapper } from './mappers/usage-response.mapper';
import { UsageUseCasesFacade } from './usage-use-cases.facade';
import { ConfigService } from '@nestjs/config';
import { parseDate } from './utils/parse-date.util';
import { UUID } from 'crypto';
import { ModelProvider } from '../../../models/domain/value-objects/model-provider.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetProviderUsageQuery } from '../../application/use-cases/get-provider-usage/get-provider-usage.query';
import { GetModelDistributionQuery } from '../../application/use-cases/get-model-distribution/get-model-distribution.query';
import {
  GetUserUsageQuery,
  UserUsageSortBy,
  SortOrder,
} from '../../application/use-cases/get-user-usage/get-user-usage.query';
import { GetUsageStatsQuery } from '../../application/use-cases/get-usage-stats/get-usage-stats.query';
import { UsageConstants } from '../../domain/value-objects/usage.constants';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('Admin Usage')
@Controller('usage')
@Roles(UserRole.ADMIN)
export class UsageController {
  constructor(
    private readonly useCases: UsageUseCasesFacade,
    private readonly configService: ConfigService,
    private readonly mapper: UsageResponseMapper,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Get usage dashboard configuration',
    description:
      'Returns configuration settings for the usage dashboard, including deployment mode. This endpoint helps the frontend determine which features to show based on the deployment type.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Usage configuration retrieved successfully. Returns deployment mode information.',
    type: UsageConfigResponseDto,
  })
  getUsageConfig(): UsageConfigResponseDto {
    const isSelfHosted = this.configService.get<boolean>(
      'app.isSelfHosted',
      false,
    );

    return {
      isSelfHosted,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get overall usage statistics',
    description:
      'Returns aggregated usage statistics including total tokens, requests, and active users. Dates are optional - if not provided, shows all usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully.',
    type: UsageStatsResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description:
      'Start date in ISO format. If provided, must be used with endDate.',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description:
      'End date in ISO format. If provided, must be used with startDate.',
    example: '2024-01-31T23:59:59.999Z',
  })
  async getUsageStats(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query = new GetUsageStatsQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
    });
    const stats = await this.useCases.getUsageStats(query);
    const dto = this.mapper.toUsageStatsDto(stats);

    return dto;
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Get usage statistics by provider',
    description:
      'Returns usage statistics grouped by model provider (OpenAI, Anthropic, etc.) with optional time series data for trend analysis. Useful for provider comparison charts. Dates are optional - if not provided, shows all usage.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Provider usage statistics retrieved successfully. Includes percentage distribution and optional time series data.',
    type: ProviderUsageResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date in ISO format',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date in ISO format',
    example: '2024-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'includeTimeSeries',
    type: Boolean,
    required: false,
    description:
      'Whether to include time series data for trend charts. Defaults to true.',
    example: true,
  })
  @ApiQuery({
    name: 'provider',
    type: String,
    required: false,
    description: 'Filter by provider (e.g., openai, anthropic)',
    example: 'openai',
  })
  @ApiQuery({
    name: 'modelId',
    type: String,
    required: false,
    description: 'Filter by model ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getProviderUsage(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
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
    const providerUsage = await this.useCases.getProviderUsage(query);
    const dto = this.mapper.toProviderUsageDto(providerUsage);

    return dto;
  }

  @Get('providers/chart')
  @ApiOperation({
    summary: 'Get provider usage time series aligned by date (chart-ready)',
    description:
      'Returns rows aligned by date with tokens per provider. Shape: { timeSeries: [{ date, values: { [provider]: tokens } }] }',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart-ready provider time series',
    type: ProviderUsageChartResponseDto,
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({
    name: 'provider',
    type: String,
    required: false,
    description: 'Filter by provider (e.g., openai, anthropic)',
    example: 'openai',
  })
  @ApiQuery({
    name: 'modelId',
    type: String,
    required: false,
    description: 'Filter by model ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getProviderUsageChart(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
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
    const providerUsage = await this.useCases.getProviderUsage(query);
    const dto = this.mapper.toProviderUsageChartDto(providerUsage);
    return dto;
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get usage distribution by model',
    description:
      'Returns usage statistics grouped by individual models with percentage distribution. Dates are optional - if not provided, shows all usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Model usage distribution retrieved successfully.',
    type: ModelDistributionResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date in ISO format',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date in ISO format',
    example: '2024-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'maxModels',
    type: Number,
    required: false,
    description:
      'Maximum number of models to return. Defaults to 10. Frontend can decide how to handle aggregation if needed.',
    example: 10,
  })
  @ApiQuery({
    name: 'modelId',
    type: String,
    required: false,
    description: 'Filter by model ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getModelDistribution(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('maxModels')
    maxModels: number = UsageConstants.MAX_MODELS,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetModelDistributionQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
      maxModels,
      modelId: modelId as UUID | undefined,
    });
    const modelDistribution = await this.useCases.getModelDistribution(query);
    const dto = this.mapper.toModelDistributionDto(modelDistribution);

    return dto;
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get usage statistics by user',
    description:
      'Returns paginated user usage statistics with search, sorting, and filtering capabilities. Includes activity status. Dates are optional - if not provided, shows all usage.',
  })
  @ApiResponse({
    status: 200,
    description:
      'User usage statistics retrieved successfully. Includes pagination metadata.',
    type: UserUsageResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date in ISO format',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date in ISO format',
    example: '2024-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of users per page (1-1000). Defaults to 50.',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    type: Number,
    required: false,
    description: 'Number of users to skip for pagination. Defaults to 0.',
    example: 0,
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search term to filter users by name or email',
    example: 'john.doe',
  })
  @ApiQuery({
    name: 'sortBy',
    enum: ['tokens', 'requests', 'lastActivity', 'userName'],
    required: false,
    description: 'Field to sort users by. Defaults to tokens.',
    example: 'tokens',
  })
  @ApiQuery({
    name: 'sortOrder',
    enum: ['asc', 'desc'],
    required: false,
    description: 'Sort order (ascending or descending). Defaults to desc.',
    example: 'desc',
  })
  async getUserUsage(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
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
    const userUsage = await this.useCases.getUserUsage(query);

    return this.mapper.toUserUsageDto(userUsage);
  }
}
