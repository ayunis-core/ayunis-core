import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Logger,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreatePermittedModelCommand } from 'src/domain/models/application/use-cases/create-permitted-model/create-permitted-model.command';
import { CreatePermittedModelUseCase } from 'src/domain/models/application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { DeletePermittedModelCommand } from 'src/domain/models/application/use-cases/delete-permitted-model/delete-permitted-model.command';
import { DeletePermittedModelUseCase } from 'src/domain/models/application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { GetConfiguredModelsByTypeQuery } from 'src/domain/models/application/use-cases/get-configured-models-by-type/get-configured-models-by-type.query';
import { GetConfiguredModelsByTypeUseCase } from 'src/domain/models/application/use-cases/get-configured-models-by-type/get-configured-models-by-type.use-case';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { SetOrgDefaultLanguageModelCommand } from 'src/domain/models/application/use-cases/set-org-default-language-model/set-org-default-language-model.command';
import { SetOrgDefaultLanguageModelUseCase } from 'src/domain/models/application/use-cases/set-org-default-language-model/set-org-default-language-model.use-case';
import { GetPermittedModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetPermittedModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { UpdatePermittedModelCommand } from 'src/domain/models/application/use-cases/update-permitted-model/update-permitted-model.command';
import { UpdatePermittedModelUseCase } from 'src/domain/models/application/use-cases/update-permitted-model/update-permitted-model.use-case';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { CreatePermittedModelDto } from './dto/create-permitted-model.dto';
import { ModelWithConfigResponseDto } from './dto/model-with-config-response.dto';
import { PermittedEmbeddingModelResponseDto } from './dto/permitted-embedding-model-response.dto';
import { PermittedImageGenerationModelResponseDto } from './dto/permitted-image-generation-model-response.dto';
import { PermittedLanguageModelResponseDto } from './dto/permitted-language-model-response.dto';
import { SetOrgDefaultModelDto } from './dto/set-org-default-model.dto';
import { UpdatePermittedModelDto } from './dto/update-permitted-model.dto';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';
import { ModelWithConfigResponseDtoMapper } from './mappers/model-with-config-response-dto.mapper';

type PermittedModelResponseDto =
  | PermittedLanguageModelResponseDto
  | PermittedEmbeddingModelResponseDto
  | PermittedImageGenerationModelResponseDto;

const permittedModelResponseSchema = {
  oneOf: [
    { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
    { $ref: getSchemaPath(PermittedEmbeddingModelResponseDto) },
    { $ref: getSchemaPath(PermittedImageGenerationModelResponseDto) },
  ],
};

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreatePermittedModelDto,
  PermittedLanguageModelResponseDto,
  PermittedEmbeddingModelResponseDto,
  PermittedImageGenerationModelResponseDto,
  ModelWithConfigResponseDto,
)
export class SuperAdminPermittedModelsController {
  private readonly logger = new Logger(
    SuperAdminPermittedModelsController.name,
  );

  constructor(
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly getConfiguredModelsByTypeUseCase: GetConfiguredModelsByTypeUseCase,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
    private readonly modelWithConfigResponseDtoMapper: ModelWithConfigResponseDtoMapper,
    private readonly setOrgDefaultLanguageModelUseCase: SetOrgDefaultLanguageModelUseCase,
    private readonly updatePermittedModelUseCase: UpdatePermittedModelUseCase,
  ) {}

  @Get(':orgId/available/language')
  @ApiOperation({ summary: 'Get all available language models' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved available language models',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ModelWithConfigResponseDto) },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getAvailableLanguageModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log(
      { orgId, userId },
      'Getting available language models for org by super admin',
    );
    const availableModels = await this.getConfiguredModelsByTypeUseCase.execute(
      new GetConfiguredModelsByTypeQuery(orgId, ModelType.LANGUAGE),
    );
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    return this.modelWithConfigResponseDtoMapper.toDto(
      availableModels,
      permittedModels,
    );
  }

  @Get(':orgId/available/embedding')
  @ApiOperation({ summary: 'Get all available embedding models' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved available embedding models',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ModelWithConfigResponseDto) },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getAvailableEmbeddingModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log(
      { orgId, userId },
      'Getting available embedding models for org by super admin',
    );
    const availableModels = await this.getConfiguredModelsByTypeUseCase.execute(
      new GetConfiguredModelsByTypeQuery(orgId, ModelType.EMBEDDING),
    );
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    return this.modelWithConfigResponseDtoMapper.toDto(
      availableModels,
      permittedModels,
    );
  }

  @Get(':orgId/available/image-generation')
  @ApiOperation({ summary: 'Get all available image-generation models' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved available image-generation models',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ModelWithConfigResponseDto) },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getAvailableImageGenerationModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log(
      { orgId, userId },
      'Getting available image-generation models for org by super admin',
    );
    const availableModels = await this.getConfiguredModelsByTypeUseCase.execute(
      new GetConfiguredModelsByTypeQuery(orgId, ModelType.IMAGE_GENERATION),
    );
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    return this.modelWithConfigResponseDtoMapper.toDto(
      availableModels,
      permittedModels,
    );
  }

  @Put(':orgId/default-model')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set or update the organization default model',
    description:
      'Sets the specified permitted model as the organization default. If a default already exists, it will be updated to the new model. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to set the default model for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: SetOrgDefaultModelDto })
  @ApiOkResponse({
    description: 'Successfully set or updated organization default model',
    type: PermittedLanguageModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permitted model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async manageOrgDefaultModel(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() setOrgDefaultModelDto: SetOrgDefaultModelDto,
  ): Promise<PermittedLanguageModelResponseDto> {
    this.logger.log(
      { orgId, userId },
      'Managing org default model by super admin',
    );
    const command = new SetOrgDefaultLanguageModelCommand(
      setOrgDefaultModelDto.permittedModelId,
      orgId,
    );
    const model = await this.setOrgDefaultLanguageModelUseCase.execute(command);
    return this.modelResponseDtoMapper.toLanguageModelDto(model);
  }

  @Get(':orgId/permitted-models')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all permitted models for a specific organization',
    description:
      'Retrieve all permitted models configured for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to retrieve permitted models for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved permitted models',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
          { $ref: getSchemaPath(PermittedEmbeddingModelResponseDto) },
          { $ref: getSchemaPath(PermittedImageGenerationModelResponseDto) },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getPermittedModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<
    (
      | PermittedLanguageModelResponseDto
      | PermittedEmbeddingModelResponseDto
      | PermittedImageGenerationModelResponseDto
    )[]
  > {
    this.logger.log(
      { orgId, userId },
      'Getting permitted models for org by super admin',
    );
    return this.getPermittedModelDtos(orgId);
  }

  @Post(':orgId/permitted-models')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a permitted model for a specific organization',
    description:
      'Create a new permitted model for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to create permitted model for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CreatePermittedModelDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully created permitted model',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model input',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Model already permitted for this organization',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createPermittedModel(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreatePermittedModelDto,
  ): Promise<void> {
    this.logger.log(
      { modelId: dto.modelId, orgId, userId },
      'Creating permitted model for org by super admin',
    );
    const command = new CreatePermittedModelCommand(
      dto.modelId,
      orgId,
      dto.anonymousOnly,
    );
    await this.createPermittedModelUseCase.execute(command);
  }

  @Delete(':orgId/permitted-models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a permitted model for a specific organization',
    description:
      'Delete a permitted model configured for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID that owns the permitted model',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Permitted model ID to delete',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted permitted model',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permitted model not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete the last permitted language model or default model',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async deletePermittedModel(
    @Param('orgId') orgId: UUID,
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logDelete(id, orgId, userId);
    await this.deletePermittedModelUseCase.execute(
      new DeletePermittedModelCommand({ orgId, permittedModelId: id }),
    );
  }

  @Patch(':orgId/permitted-models/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a permitted model for a specific organization',
    description:
      'Update a permitted model configured for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID that owns the permitted model',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Permitted model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdatePermittedModelDto })
  @ApiOkResponse({
    description: 'Successfully updated permitted model',
    schema: permittedModelResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permitted model not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data provided',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updatePermittedModel(
    @Param('orgId') orgId: UUID,
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdatePermittedModelDto,
  ): Promise<PermittedModelResponseDto> {
    this.logUpdate(id, orgId, userId);
    return this.updateModel(orgId, id, dto);
  }

  private async getPermittedModelDtos(
    orgId: UUID,
  ): Promise<
    (
      | PermittedLanguageModelResponseDto
      | PermittedEmbeddingModelResponseDto
      | PermittedImageGenerationModelResponseDto
    )[]
  > {
    const models = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    this.logger.log(
      { modelCount: models.length, orgId },
      'Successfully retrieved permitted models for org',
    );
    return models.map((model) => this.modelResponseDtoMapper.toDto(model));
  }

  private async updateModel(
    orgId: UUID,
    id: UUID,
    dto: UpdatePermittedModelDto,
  ): Promise<PermittedModelResponseDto> {
    const updated = await this.updatePermittedModelUseCase.execute(
      new UpdatePermittedModelCommand({
        permittedModelId: id,
        orgId,
        anonymousOnly: dto.anonymousOnly,
      }),
    );
    if (updated instanceof PermittedLanguageModel) {
      return this.modelResponseDtoMapper.toLanguageModelDto(updated);
    }
    if (updated instanceof PermittedEmbeddingModel) {
      return this.modelResponseDtoMapper.toEmbeddingModelDto(updated);
    }
    if (updated instanceof PermittedImageGenerationModel) {
      return this.modelResponseDtoMapper.toImageGenerationModelDto(updated);
    }
    throw new Error(`Unknown model type: ${updated.constructor.name}`);
  }

  private logDelete(id: UUID, orgId: UUID, userId: UUID): void {
    this.logger.log(
      { permittedModelId: id, orgId, userId },
      'Deleting permitted model for org by super admin',
    );
  }

  private logUpdate(id: UUID, orgId: UUID, userId: UUID): void {
    this.logger.log(
      { permittedModelId: id, orgId, userId },
      'Updating permitted model for org by super admin',
    );
  }
}
