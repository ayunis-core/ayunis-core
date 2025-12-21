import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreatePermittedModelUseCase } from '../../application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { CreatePermittedModelCommand } from '../../application/use-cases/create-permitted-model/create-permitted-model.command';
import { DeletePermittedModelUseCase } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.command';
import { UpdatePermittedModelUseCase } from '../../application/use-cases/update-permitted-model/update-permitted-model.use-case';
import { UpdatePermittedModelCommand } from '../../application/use-cases/update-permitted-model/update-permitted-model.command';
import { GetPermittedModelsUseCase } from '../../application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../../application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetAvailableModelsUseCase } from '../../application/use-cases/get-available-models/get-available-models.use-case';
import { GetAvailableModelsQuery } from '../../application/use-cases/get-available-models/get-available-models.query';
import { CreatePermittedModelDto } from './dto/create-permitted-model.dto';
import { UpdatePermittedModelDto } from './dto/update-permitted-model.dto';
import { PermittedLanguageModelResponseDto } from './dto/permitted-language-model-response.dto';
import { PermittedEmbeddingModelResponseDto } from './dto/permitted-embedding-model-response.dto';
import { ModelWithConfigResponseDto } from './dto/model-with-config-response.dto';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';
import { ModelWithConfigResponseDtoMapper } from './mappers/model-with-config-response-dto.mapper';
import {
  PermittedLanguageModel,
  PermittedEmbeddingModel,
} from '../../domain/permitted-model.entity';
import { GetAllModelsUseCase } from '../../application/use-cases/get-all-models/get-all-models.use-case';
import { GetModelByIdUseCase } from '../../application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { GetModelByIdQuery } from '../../application/use-cases/get-model-by-id/get-model-by-id.query';
import { CreateLanguageModelUseCase } from '../../application/use-cases/create-language-model/create-language-model.use-case';
import { CreateLanguageModelCommand } from '../../application/use-cases/create-language-model/create-language-model.command';
import { UpdateLanguageModelUseCase } from '../../application/use-cases/update-language-model/update-language-model.use-case';
import { UpdateLanguageModelCommand } from '../../application/use-cases/update-language-model/update-language-model.command';
import { CreateEmbeddingModelUseCase } from '../../application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { CreateEmbeddingModelCommand } from '../../application/use-cases/create-embedding-model/create-embedding-model.command';
import { UpdateEmbeddingModelUseCase } from '../../application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { UpdateEmbeddingModelCommand } from '../../application/use-cases/update-embedding-model/update-embedding-model.command';
import { CreateLanguageModelRequestDto } from './dto/create-language-model-request.dto';
import { UpdateLanguageModelRequestDto } from './dto/update-language-model-request.dto';
import { CreateEmbeddingModelRequestDto } from './dto/create-embedding-model-request.dto';
import { UpdateEmbeddingModelRequestDto } from './dto/update-embedding-model-request.dto';
import { LanguageModelResponseDto } from './dto/language-model-response.dto';
import { EmbeddingModelResponseDto } from './dto/embedding-model-response.dto';
import { ModelResponseDto } from './dto/model-response.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';
import { DeleteModelUseCase } from '../../application/use-cases/delete-model/delete-model.use-case';
import { DeleteModelCommand } from '../../application/use-cases/delete-model/delete-model.command';
import { ManageOrgDefaultModelUseCase } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.use-case';
import { ManageOrgDefaultModelCommand } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.command';
import { SetOrgDefaultModelDto } from './dto/set-org-default-model.dto';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreatePermittedModelDto,
  PermittedLanguageModelResponseDto,
  PermittedEmbeddingModelResponseDto,
  ModelWithConfigResponseDto,
  CreateLanguageModelRequestDto,
  UpdateLanguageModelRequestDto,
  CreateEmbeddingModelRequestDto,
  UpdateEmbeddingModelRequestDto,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
)
export class SuperAdminModelsController {
  private readonly logger = new Logger(SuperAdminModelsController.name);

  constructor(
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly getAvailableModelsUseCase: GetAvailableModelsUseCase,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
    private readonly modelWithConfigResponseDtoMapper: ModelWithConfigResponseDtoMapper,
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly getModelByIdUseCase: GetModelByIdUseCase,
    private readonly createLanguageModelUseCase: CreateLanguageModelUseCase,
    private readonly updateLanguageModelUseCase: UpdateLanguageModelUseCase,
    private readonly createEmbeddingModelUseCase: CreateEmbeddingModelUseCase,
    private readonly updateEmbeddingModelUseCase: UpdateEmbeddingModelUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
    private readonly deleteModelUseCase: DeleteModelUseCase,
    private readonly manageOrgDefaultModelUseCase: ManageOrgDefaultModelUseCase,
    private readonly updatePermittedModelUseCase: UpdatePermittedModelUseCase,
  ) {}

  @Get(':orgId/available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all available models',
    description:
      'Retrieve all available models from the registry with their permitted status for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to check permitted status for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved available models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(ModelWithConfigResponseDto),
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getAvailableModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log(
      `Getting available models for org ${orgId} by super admin ${userId}`,
    );

    const query = new GetAvailableModelsQuery(orgId);
    const allAvailableModels =
      await this.getAvailableModelsUseCase.execute(query);

    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );

    const responseDtos = this.modelWithConfigResponseDtoMapper.toDto(
      allAvailableModels,
      permittedModels,
    );

    this.logger.log(
      `Successfully retrieved ${allAvailableModels.length} available models for org ${orgId}`,
    );

    return responseDtos;
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
    description: 'Successfully set or updated the organization default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDto),
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
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
      `Super admin ${userId} setting default model ${setOrgDefaultModelDto.permittedModelId} for org ${orgId}`,
    );

    const command = new ManageOrgDefaultModelCommand(
      setOrgDefaultModelDto.permittedModelId,
      orgId,
    );

    const model = await this.manageOrgDefaultModelUseCase.execute(command);

    this.logger.log(
      `Successfully set default model ${model.id} for org ${orgId} by super admin ${userId}`,
    );

    return this.modelResponseDtoMapper.toLanguageModelDto(model);
  }

  @Delete('catalog/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a model from the catalog',
    description:
      'Remove a model (language or embedding) from the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to delete',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted model',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async deleteCatalogModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.log(`Deleting catalog model ${id} by super admin ${userId}`);

    const command = new DeleteModelCommand(id);
    await this.deleteModelUseCase.execute(command);

    this.logger.log(`Successfully deleted catalog model ${id}`);
  }

  @Get(':orgId/permitted-models')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all permitted models for a specific organization',
    description:
      'Retrieve all permitted models for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to get permitted models for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved permitted models',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
          { $ref: getSchemaPath(PermittedEmbeddingModelResponseDto) },
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
    (PermittedLanguageModelResponseDto | PermittedEmbeddingModelResponseDto)[]
  > {
    this.logger.log(
      `Getting permitted models for org ${orgId} by super admin ${userId}`,
    );

    const query = new GetPermittedModelsQuery(orgId);
    const models = await this.getPermittedModelsUseCase.execute(query);

    const responseDtos = models.map((model) => {
      if (model instanceof PermittedLanguageModel) {
        return this.modelResponseDtoMapper.toLanguageModelDto(model);
      } else if (model instanceof PermittedEmbeddingModel) {
        return this.modelResponseDtoMapper.toEmbeddingModelDto(model);
      }
      throw new Error(`Unknown model type: ${model.constructor.name}`);
    });

    this.logger.log(
      `Successfully retrieved ${models.length} permitted models for org ${orgId}`,
    );

    return responseDtos;
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
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Model already permitted for this organization',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createPermittedModel(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() createPermittedModelDto: CreatePermittedModelDto,
  ): Promise<void> {
    this.logger.log(
      `Creating permitted model for org ${orgId} by super admin ${userId}`,
    );

    const command = new CreatePermittedModelCommand(
      createPermittedModelDto.modelId,
      orgId,
      createPermittedModelDto.anonymousOnly,
    );

    await this.createPermittedModelUseCase.execute(command);
    this.logger.log(`Successfully created permitted model for org ${orgId}`);
  }

  @Delete(':orgId/permitted-models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a permitted model for a specific organization',
    description:
      'Delete a permitted model for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to delete permitted model for',
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
    this.logger.log(
      `Deleting permitted model ${id} for org ${orgId} by super admin ${userId}`,
    );

    const command = new DeletePermittedModelCommand({
      orgId,
      permittedModelId: id,
    });

    await this.deletePermittedModelUseCase.execute(command);
    this.logger.log(
      `Successfully deleted permitted model ${id} for org ${orgId}`,
    );
  }

  @Patch(':orgId/permitted-models/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a permitted model for a specific organization',
    description:
      'Update the settings of a permitted model for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to update permitted model for',
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
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
        { $ref: getSchemaPath(PermittedEmbeddingModelResponseDto) },
      ],
    },
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
    @Body() updatePermittedModelDto: UpdatePermittedModelDto,
  ): Promise<
    PermittedLanguageModelResponseDto | PermittedEmbeddingModelResponseDto
  > {
    this.logger.log(
      `Updating permitted model ${id} for org ${orgId} by super admin ${userId}`,
    );

    const command = new UpdatePermittedModelCommand({
      permittedModelId: id,
      orgId,
      anonymousOnly: updatePermittedModelDto.anonymousOnly,
    });

    const updatedModel =
      await this.updatePermittedModelUseCase.execute(command);

    this.logger.log(
      `Successfully updated permitted model ${id} for org ${orgId}`,
    );

    if (updatedModel instanceof PermittedLanguageModel) {
      return this.modelResponseDtoMapper.toLanguageModelDto(updatedModel);
    } else if (updatedModel instanceof PermittedEmbeddingModel) {
      return this.modelResponseDtoMapper.toEmbeddingModelDto(updatedModel);
    }
    throw new Error(`Unknown model type: ${updatedModel.constructor.name}`);
  }

  // Catalog Management Endpoints

  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all models in the catalog',
    description:
      'Retrieve all models (language and embedding) from the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all models',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(LanguageModelResponseDto) },
          { $ref: getSchemaPath(EmbeddingModelResponseDto) },
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
  async getAllCatalogModels(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelResponseDto[]> {
    this.logger.log(`Getting all catalog models by super admin ${userId}`);

    const models = await this.getAllModelsUseCase.execute();
    const responseDtos = this.catalogModelResponseDtoMapper.toDtoArray(models);

    this.logger.log(`Successfully retrieved ${models.length} catalog models`);

    return responseDtos;
  }

  @Get('catalog/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a model by ID from the catalog',
    description:
      'Retrieve a specific model from the master catalog by its ID. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to retrieve',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved model',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(LanguageModelResponseDto) },
        { $ref: getSchemaPath(EmbeddingModelResponseDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getCatalogModelById(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelResponseDto> {
    this.logger.log(`Getting catalog model ${id} by super admin ${userId}`);

    const query = new GetModelByIdQuery(id);
    const model = await this.getModelByIdUseCase.execute(query);
    const responseDto = this.catalogModelResponseDtoMapper.toDto(model);

    this.logger.log(`Successfully retrieved catalog model ${id}`);

    return responseDto;
  }

  @Post('catalog/language')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new language model in the catalog',
    description:
      'Create a new language model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiBody({ type: CreateLanguageModelRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created language model',
    type: LanguageModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Model already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createLanguageModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateLanguageModelRequestDto,
  ): Promise<LanguageModelResponseDto> {
    this.logger.log(
      `Creating language model ${dto.name} by super admin ${userId}`,
    );

    const command = new CreateLanguageModelCommand({
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      canStream: dto.canStream,
      canUseTools: dto.canUseTools,
      isReasoning: dto.isReasoning,
      canVision: dto.canVision,
      isArchived: dto.isArchived,
    });

    const model = await this.createLanguageModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toLanguageModelDto(model);

    this.logger.log(`Successfully created language model ${model.id}`);

    return responseDto;
  }

  @Patch('catalog/language/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a language model in the catalog',
    description:
      'Update an existing language model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateLanguageModelRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated language model',
    type: LanguageModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateLanguageModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdateLanguageModelRequestDto,
  ): Promise<LanguageModelResponseDto> {
    this.logger.log(`Updating language model ${id} by super admin ${userId}`);

    const command = new UpdateLanguageModelCommand({
      id,
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      canStream: dto.canStream,
      canUseTools: dto.canUseTools,
      isReasoning: dto.isReasoning,
      canVision: dto.canVision,
      isArchived: dto.isArchived,
    });

    const model = await this.updateLanguageModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toLanguageModelDto(model);

    this.logger.log(`Successfully updated language model ${id}`);

    return responseDto;
  }

  @Post('catalog/embedding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new embedding model in the catalog',
    description:
      'Create a new embedding model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiBody({ type: CreateEmbeddingModelRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created embedding model',
    type: EmbeddingModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Model already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createEmbeddingModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateEmbeddingModelRequestDto,
  ): Promise<EmbeddingModelResponseDto> {
    this.logger.log(
      `Creating embedding model ${dto.name} by super admin ${userId}`,
    );

    const command = new CreateEmbeddingModelCommand({
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      dimensions: dto.dimensions,
      isArchived: dto.isArchived,
    });

    const model = await this.createEmbeddingModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toEmbeddingModelDto(model);

    this.logger.log(`Successfully created embedding model ${model.id}`);

    return responseDto;
  }

  @Patch('catalog/embedding/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an embedding model in the catalog',
    description:
      'Update an existing embedding model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateEmbeddingModelRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated embedding model',
    type: EmbeddingModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateEmbeddingModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdateEmbeddingModelRequestDto,
  ): Promise<EmbeddingModelResponseDto> {
    this.logger.log(`Updating embedding model ${id} by super admin ${userId}`);

    const command = new UpdateEmbeddingModelCommand({
      id,
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      dimensions: dto.dimensions,
      isArchived: dto.isArchived,
    });

    const model = await this.updateEmbeddingModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toEmbeddingModelDto(model);

    this.logger.log(`Successfully updated embedding model ${id}`);

    return responseDto;
  }
}
