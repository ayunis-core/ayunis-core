import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserUsageResponseDto } from './dto/user-usage-response.dto';
import { UsageConfigResponseDto } from './dto/usage-config-response.dto';
import { CreditUsageResponseDto } from './dto/credit-usage-response.dto';
import { UsageResponseMapper } from './mappers/usage-response.mapper';
import { UsageUseCasesFacade } from './usage-use-cases.facade';
import { ConfigService } from '@nestjs/config';
import { parseDate } from './utils/parse-date.util';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  GetUserUsageQuery,
  UserUsageSortBy,
  SortOrder,
} from '../../application/use-cases/get-user-usage/get-user-usage.query';
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

  @Get('credits')
  @ApiOperation({
    summary: 'Get credit usage for the current month',
    description:
      'Returns the monthly credit budget, credits consumed this month, and credits remaining. Fields are null if the organization does not have a usage-based subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit usage retrieved successfully.',
    type: CreditUsageResponseDto,
  })
  async getCreditUsage(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<CreditUsageResponseDto> {
    const creditUsage = await this.useCases.getCreditUsage(orgId);
    return {
      monthlyCredits: creditUsage.monthlyCredits,
      creditsUsed: creditUsage.creditsUsed,
      creditsRemaining: creditUsage.creditsRemaining,
    };
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
    enum: ['credits', 'requests', 'lastActivity', 'userName'],
    required: false,
    description: 'Field to sort users by. Defaults to credits.',
    example: 'credits',
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
    @Query('sortBy') sortBy: UserUsageSortBy = 'credits',
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
