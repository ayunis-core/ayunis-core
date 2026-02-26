import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsageStatsResponseDto } from './dto/usage-stats-response.dto';
import { UsageConfigResponseDto } from './dto/usage-config-response.dto';
import { ModelDistributionResponseDto } from './dto/model-distribution-response.dto';
import { UsageStatsResponseDtoMapper } from './mappers/usage-stats-response-dto.mapper';
import { ModelDistributionResponseDtoMapper } from './mappers/model-distribution-response-dto.mapper';
import { ConfigService } from '@nestjs/config';
import { parseDate } from './utils/parse-date.util';
import { UUID } from 'crypto';
import { GetModelDistributionUseCase } from '../../application/use-cases/get-model-distribution/get-model-distribution.use-case';
import { GetUsageStatsUseCase } from '../../application/use-cases/get-usage-stats/get-usage-stats.use-case';
import { GetModelDistributionQuery } from '../../application/use-cases/get-model-distribution/get-model-distribution.query';
import { GetUsageStatsQuery } from '../../application/use-cases/get-usage-stats/get-usage-stats.query';
import { UsageConstants } from '../../domain/value-objects/usage.constants';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Usage')
@Controller('super-admin/usage')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUsageController {
  constructor(
    private readonly getUsageStatsUseCase: GetUsageStatsUseCase,
    private readonly getModelDistributionUseCase: GetModelDistributionUseCase,
    private readonly configService: ConfigService,
    private readonly usageStatsMapper: UsageStatsResponseDtoMapper,
    private readonly modelDistributionMapper: ModelDistributionResponseDtoMapper,
  ) {}

  @Get(':orgId/config')
  @ApiOperation({
    summary: 'Get usage dashboard configuration for an organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: UsageConfigResponseDto })
  getUsageConfig(): UsageConfigResponseDto {
    const isSelfHosted = this.configService.get<boolean>(
      'app.isSelfHosted',
      false,
    );
    return { isSelfHosted };
  }

  @Get(':orgId/stats')
  @ApiOperation({ summary: 'Get overall usage statistics for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: UsageStatsResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  async getUsageStats(
    @Param('orgId') orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query = new GetUsageStatsQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
    });
    const stats = await this.getUsageStatsUseCase.execute(query);
    return this.usageStatsMapper.toDto(stats);
  }

  @Get(':orgId/models')
  @ApiOperation({
    summary: 'Get usage distribution by model for an organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: ModelDistributionResponseDto })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'maxModels', type: Number, required: false })
  @ApiQuery({ name: 'modelId', type: String, required: false })
  async getModelDistribution(
    @Param('orgId') orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('maxModels') maxModels: number = UsageConstants.MAX_MODELS,
    @Query('modelId') modelId?: string,
  ) {
    const query = new GetModelDistributionQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
      maxModels,
      modelId: modelId as UUID | undefined,
    });
    const modelDistribution =
      await this.getModelDistributionUseCase.execute(query);
    return this.modelDistributionMapper.toDto(modelDistribution);
  }
}
