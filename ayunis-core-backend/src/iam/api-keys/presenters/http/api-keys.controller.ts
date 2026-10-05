import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Logger,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/create-api-key/create-api-key.use-case';
import { CreateApiKeyCommand } from 'src/iam/api-keys/application/use-cases/create-api-key/create-api-key.command';
import { ListApiKeysByOrgUseCase } from 'src/iam/api-keys/application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { RevokeApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/revoke-api-key/revoke-api-key.use-case';
import { RevokeApiKeyCommand } from 'src/iam/api-keys/application/use-cases/revoke-api-key/revoke-api-key.command';
import { UpdateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/update-api-key/update-api-key.use-case';
import { UpdateApiKeyCommand } from 'src/iam/api-keys/application/use-cases/update-api-key/update-api-key.command';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';
import { UpdateApiKeyDto } from './dtos/update-api-key.dto';
import { ApiKeyResponseDto } from './dtos/api-key-response.dto';
import { CreateApiKeyResponseDto } from './dtos/create-api-key-response.dto';
import { ApiKeyDtoMapper } from './mappers/api-key-dto.mapper';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('api-keys')
@Controller('api-keys')
@ApiExtraModels(
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  CreateApiKeyResponseDto,
)
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    private readonly listApiKeysByOrgUseCase: ListApiKeysByOrgUseCase,
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
    private readonly updateApiKeyUseCase: UpdateApiKeyUseCase,
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
  @RequireSubscription({ type: SubscriptionType.USAGE_BASED })
  @Post()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
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
    this.logger.log({ name: dto.name }, 'Creating API key');
    const command = new CreateApiKeyCommand(
      dto.name,
      dto.expiresAt ?? null,
      dto.description ?? null,
    );
    const { apiKey, secret } = await this.createApiKeyUseCase.execute(command);
    return this.apiKeyDtoMapper.toCreateDto(apiKey, secret);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @RateLimit({ limit: 30, windowMs: 15 * 60 * 1000 })
  @ApiOperation({
    summary:
      'Rename an active API key, change its description or set, change or remove its expiry date. The secret stays the same.',
  })
  @ApiResponse({
    status: 200,
    description: 'API key successfully updated',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or an expiry date that is not in the future',
  })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to edit API keys',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({
    status: 409,
    description: 'The API key is revoked or expired and cannot be edited',
  })
  async updateApiKey(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    this.logger.log({ id }, 'Updating API key');
    const apiKey = await this.updateApiKeyUseCase.execute(
      new UpdateApiKeyCommand(id, {
        name: dto.name,
        description: dto.description,
        expiresAt: dto.expiresAt,
      }),
    );
    return this.apiKeyDtoMapper.toDto(apiKey);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @RateLimit({ limit: 30, windowMs: 15 * 60 * 1000 })
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
    this.logger.log({ id }, 'Revoking API key');
    await this.revokeApiKeyUseCase.execute(new RevokeApiKeyCommand(id));
  }
}
