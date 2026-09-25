import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetApiKeyUsageQuery } from 'src/domain/usage/application/use-cases/get-api-key-usage/get-api-key-usage.query';
import { GetApiKeyUsageUseCase } from 'src/domain/usage/application/use-cases/get-api-key-usage/get-api-key-usage.use-case';
import { ApiKeyUsageResponseDto } from './dto/api-key-usage-response.dto';
import { ApiKeyUsageResponseDtoMapper } from './mappers/api-key-usage-response-dto.mapper';
import { parseDate } from './utils/parse-date.util';

@ApiTags('Admin Usage')
@Controller('usage')
@Roles(UserRole.ADMIN)
export class ApiKeyUsageController {
  constructor(
    private readonly getApiKeyUsageUseCase: GetApiKeyUsageUseCase,
    private readonly mapper: ApiKeyUsageResponseDtoMapper,
  ) {}

  @Get('api-keys')
  @ApiOperation({
    summary: 'Get usage statistics by API key',
    description:
      'Returns token, request and credit usage for every API key of the current organization, including revoked and expired keys. Dates are optional - if not provided, shows all usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'API key usage statistics retrieved successfully.',
    type: ApiKeyUsageResponseDto,
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
  async getApiKeyUsage(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiKeyUsageResponseDto> {
    const query = new GetApiKeyUsageQuery({
      organizationId: orgId,
      startDate: startDate ? parseDate(startDate, 'startDate') : undefined,
      endDate: endDate ? parseDate(endDate, 'endDate') : undefined,
    });
    const apiKeyUsage = await this.getApiKeyUsageUseCase.execute(query);
    return this.mapper.toDto(apiKeyUsage);
  }
}
