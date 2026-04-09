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
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
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
import { CreateEmbeddingModelCommand } from '../../application/use-cases/create-embedding-model/create-embedding-model.command';
import { CreateEmbeddingModelUseCase } from '../../application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { CreateLanguageModelCommand } from '../../application/use-cases/create-language-model/create-language-model.command';
import { CreateLanguageModelUseCase } from '../../application/use-cases/create-language-model/create-language-model.use-case';
import { DeleteModelCommand } from '../../application/use-cases/delete-model/delete-model.command';
import { DeleteModelUseCase } from '../../application/use-cases/delete-model/delete-model.use-case';
import { GetAllModelsUseCase } from '../../application/use-cases/get-all-models/get-all-models.use-case';
import { GetModelByIdQuery } from '../../application/use-cases/get-model-by-id/get-model-by-id.query';
import { GetModelByIdUseCase } from '../../application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { UpdateEmbeddingModelCommand } from '../../application/use-cases/update-embedding-model/update-embedding-model.command';
import { UpdateEmbeddingModelUseCase } from '../../application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { UpdateLanguageModelCommand } from '../../application/use-cases/update-language-model/update-language-model.command';
import { UpdateLanguageModelUseCase } from '../../application/use-cases/update-language-model/update-language-model.use-case';
import { CreateEmbeddingModelRequestDto } from './dto/create-embedding-model-request.dto';
import { CreateLanguageModelRequestDto } from './dto/create-language-model-request.dto';
import { EmbeddingModelResponseDto } from './dto/embedding-model-response.dto';
import { ImageGenerationModelResponseDto } from './dto/image-generation-model-response.dto';
import { LanguageModelResponseDto } from './dto/language-model-response.dto';
import { ModelResponseDto } from './dto/model-response.dto';
import { UpdateEmbeddingModelRequestDto } from './dto/update-embedding-model-request.dto';
import { UpdateLanguageModelRequestDto } from './dto/update-language-model-request.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreateLanguageModelRequestDto,
  UpdateLanguageModelRequestDto,
  CreateEmbeddingModelRequestDto,
  UpdateEmbeddingModelRequestDto,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
)
export class SuperAdminCatalogModelsController {
  private readonly logger = new Logger(SuperAdminCatalogModelsController.name);

  constructor(
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly getModelByIdUseCase: GetModelByIdUseCase,
    private readonly createLanguageModelUseCase: CreateLanguageModelUseCase,
    private readonly updateLanguageModelUseCase: UpdateLanguageModelUseCase,
    private readonly createEmbeddingModelUseCase: CreateEmbeddingModelUseCase,
    private readonly updateEmbeddingModelUseCase: UpdateEmbeddingModelUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
    private readonly deleteModelUseCase: DeleteModelUseCase,
  ) {}

  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all models in the catalog',
    description:
      'Retrieve all models (language, embedding, and image-generation) from the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all models',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(LanguageModelResponseDto) },
          { $ref: getSchemaPath(EmbeddingModelResponseDto) },
          { $ref: getSchemaPath(ImageGenerationModelResponseDto) },
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
        { $ref: getSchemaPath(ImageGenerationModelResponseDto) },
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

  @Delete('catalog/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a model from the catalog',
    description:
      'Remove a model (language, embedding, or image-generation) from the master catalog. This endpoint is only accessible to super admins.',
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
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
      tier: dto.tier,
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
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
      tier: dto.tier,
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
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
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
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
    });
    const model = await this.updateEmbeddingModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toEmbeddingModelDto(model);
    this.logger.log(`Successfully updated embedding model ${id}`);
    return responseDto;
  }
}
