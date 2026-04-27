import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreateApiKeyUseCase } from '../../application/use-cases/create-api-key/create-api-key.use-case';
import { CreateApiKeyCommand } from '../../application/use-cases/create-api-key/create-api-key.command';
import { ListApiKeysByOrgUseCase } from '../../application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { RevokeApiKeyUseCase } from '../../application/use-cases/revoke-api-key/revoke-api-key.use-case';
import { RevokeApiKeyCommand } from '../../application/use-cases/revoke-api-key/revoke-api-key.command';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';
import { ApiKeyResponseDto } from './dtos/api-key-response.dto';
import { CreateApiKeyResponseDto } from './dtos/create-api-key-response.dto';
import { ApiKeyDtoMapper } from './mappers/api-key-dto.mapper';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('api-keys')
@Controller('api-keys')
@ApiExtraModels(CreateApiKeyDto, ApiKeyResponseDto, CreateApiKeyResponseDto)
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    private readonly listApiKeysByOrgUseCase: ListApiKeysByOrgUseCase,
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
    private readonly apiKeyDtoMapper: ApiKeyDtoMapper,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List API keys for the current organization' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved API keys',
    type: [ApiKeyResponseDto],
  })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to view API keys',
  })
  async listApiKeys(): Promise<ApiKeyResponseDto[]> {
    this.logger.log('Listing API keys for organization');
    const apiKeys = await this.listApiKeysByOrgUseCase.execute();
    return this.apiKeyDtoMapper.toDtoList(apiKeys);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary:
      'Create a new API key. The full plaintext secret is returned ONLY in this response.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created API key',
    schema: { $ref: getSchemaPath(CreateApiKeyResponseDto) },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to create API keys',
  })
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    this.logger.log('Creating API key', { name: dto.name });
    const command = new CreateApiKeyCommand(dto.name, dto.expiresAt ?? null);
    const { apiKey, secret } = await this.createApiKeyUseCase.execute(command);
    return this.apiKeyDtoMapper.toCreateDto(apiKey, secret);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key successfully revoked' })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to revoke this API key',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('Revoking API key', { id });
    await this.revokeApiKeyUseCase.execute(new RevokeApiKeyCommand(id));
  }
}
