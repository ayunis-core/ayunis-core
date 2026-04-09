import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetAvailableImageGenerationModelsQuery } from '../../application/use-cases/get-available-image-generation-models/get-available-image-generation-models.query';
import { GetAvailableImageGenerationModelsUseCase } from '../../application/use-cases/get-available-image-generation-models/get-available-image-generation-models.use-case';
import { GetAvailableModelsQuery } from '../../application/use-cases/get-available-models/get-available-models.query';
import { GetAvailableModelsUseCase } from '../../application/use-cases/get-available-models/get-available-models.use-case';
import { CreatePermittedModelCommand } from '../../application/use-cases/create-permitted-model/create-permitted-model.command';
import { CreatePermittedModelUseCase } from '../../application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.command';
import { DeletePermittedModelUseCase } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { GetEffectiveLanguageModelsQuery } from '../../application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from '../../application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetModelProviderInfoQuery } from '../../application/use-cases/get-model-provider-info/get-model-provider-info.query';
import { GetModelProviderInfoUseCase } from '../../application/use-cases/get-model-provider-info/get-model-provider-info.use-case';
import { GetPermittedLanguageModelsQuery } from '../../application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import { GetPermittedLanguageModelsUseCase } from '../../application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedModelsQuery } from '../../application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetPermittedModelsUseCase } from '../../application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { IsEmbeddingModelEnabledQuery } from '../../application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.query';
import { IsEmbeddingModelEnabledUseCase } from '../../application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.use-case';
import { UpdatePermittedModelCommand } from '../../application/use-cases/update-permitted-model/update-permitted-model.command';
import { UpdatePermittedModelUseCase } from '../../application/use-cases/update-permitted-model/update-permitted-model.use-case';
import { ModelProviderInfoRegistry } from '../../application/registry/model-provider-info.registry';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from '../../domain/permitted-model.entity';
import { AvailableImageGenerationModelResponseDto } from './dto/available-image-generation-model-response.dto';
import { CreatePermittedModelDto } from './dto/create-permitted-model.dto';
import { EmbeddingModelEnabledResponseDto } from './dto/embedding-model-enabled-response.dto';
import { ModelProviderInfoResponseDto } from './dto/model-provider-info-response.dto';
import { ModelWithConfigResponseDto } from './dto/model-with-config-response.dto';
import { PermittedEmbeddingModelResponseDto } from './dto/permitted-embedding-model-response.dto';
import { PermittedImageGenerationModelResponseDto } from './dto/permitted-image-generation-model-response.dto';
import { PermittedLanguageModelResponseDto } from './dto/permitted-language-model-response.dto';
import { UpdatePermittedModelDto } from './dto/update-permitted-model.dto';
import { AvailableImageGenerationModelResponseDtoMapper } from './mappers/available-image-generation-model-response-dto.mapper';
import { ModelProviderInfoResponseDtoMapper } from './mappers/model-provider-info-response-dto.mapper';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';
import { ModelWithConfigResponseDtoMapper } from './mappers/model-with-config-response-dto.mapper';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly getAvailableModelsUseCase: GetAvailableModelsUseCase,
    private readonly getAvailableImageGenerationModelsUseCase: GetAvailableImageGenerationModelsUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly updatePermittedModelUseCase: UpdatePermittedModelUseCase,
    private readonly getModelProviderInfoUseCase: GetModelProviderInfoUseCase,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
    private readonly modelWithConfigResponseDtoMapper: ModelWithConfigResponseDtoMapper,
    private readonly availableImageGenerationModelResponseDtoMapper: AvailableImageGenerationModelResponseDtoMapper,
    private readonly modelProviderInfoResponseDtoMapper: ModelProviderInfoResponseDtoMapper,
    private readonly getPermittedLanguageModelsUseCase: GetPermittedLanguageModelsUseCase,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly isEmbeddingModelEnabledUseCase: IsEmbeddingModelEnabledUseCase,
  ) {}

  @Get('available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all available models' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all available models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(ModelWithConfigResponseDto),
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(ModelWithConfigResponseDto)
  async getAvailableModelsWithConfig(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log('getAvailableModels');
    const query = new GetAvailableModelsQuery(orgId);
    const allAvailableModelsWithConfig =
      await this.getAvailableModelsUseCase.execute(query);
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    return this.modelWithConfigResponseDtoMapper.toDto(
      allAvailableModelsWithConfig,
      permittedModels,
    );
  }

  @Get('available/image-generation')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all available image-generation models' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all available image-generation models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(AvailableImageGenerationModelResponseDto),
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(AvailableImageGenerationModelResponseDto)
  async getAvailableImageGenerationModels(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<AvailableImageGenerationModelResponseDto[]> {
    this.logger.log('getAvailableImageGenerationModels');
    const query = new GetAvailableImageGenerationModelsQuery(orgId);
    const availableModels =
      await this.getAvailableImageGenerationModelsUseCase.execute(query);
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    return this.availableImageGenerationModelResponseDtoMapper.toDto(
      availableModels,
      permittedModels.filter(
        (model): model is PermittedImageGenerationModel =>
          model instanceof PermittedImageGenerationModel,
      ),
    );
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Get all available model providers with their info',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all model providers',
    type: [ModelProviderInfoResponseDto],
  })
  @ApiExtraModels(ModelProviderInfoResponseDto)
  getProviders(): ModelProviderInfoResponseDto[] {
    this.logger.log('getProviders');
    return this.modelProviderInfoRegistry
      .getAllProviderInfos()
      .map((info) => this.modelProviderInfoResponseDtoMapper.toDto(info));
  }

  @Post('permitted')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a permitted model' })
  @ApiBody({ type: CreatePermittedModelDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully created a permitted model',
  })
  @ApiResponse({ status: 400, description: 'Invalid model input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(CreatePermittedModelDto)
  async createPermittedModel(
    @Body() createPermittedModelDto: CreatePermittedModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    const command = new CreatePermittedModelCommand(
      createPermittedModelDto.modelId,
      orgId,
      createPermittedModelDto.anonymousOnly,
    );
    await this.createPermittedModelUseCase.execute(command);
  }

  @Delete('permitted/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a permitted model' })
  @ApiResponse({
    status: 200,
    description: 'Successfully deleted a permitted model',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePermittedModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    const command = new DeletePermittedModelCommand({
      orgId,
      permittedModelId: id,
    });
    await this.deletePermittedModelUseCase.execute(command);
  }

  @Patch('permitted/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a permitted model' })
  @ApiBody({ type: UpdatePermittedModelDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated a permitted model',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
        { $ref: getSchemaPath(PermittedEmbeddingModelResponseDto) },
        { $ref: getSchemaPath(PermittedImageGenerationModelResponseDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
  @ApiExtraModels(
    UpdatePermittedModelDto,
    PermittedLanguageModelResponseDto,
    PermittedEmbeddingModelResponseDto,
    PermittedImageGenerationModelResponseDto,
  )
  async updatePermittedModel(
    @Param('id') id: UUID,
    @Body() updatePermittedModelDto: UpdatePermittedModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<
    | PermittedLanguageModelResponseDto
    | PermittedEmbeddingModelResponseDto
    | PermittedImageGenerationModelResponseDto
  > {
    const command = new UpdatePermittedModelCommand({
      permittedModelId: id,
      orgId,
      anonymousOnly: updatePermittedModelDto.anonymousOnly,
    });
    const model = await this.updatePermittedModelUseCase.execute(command);
    if (model instanceof PermittedLanguageModel) {
      return this.modelResponseDtoMapper.toLanguageModelDto(model);
    }
    if (model instanceof PermittedEmbeddingModel) {
      return this.modelResponseDtoMapper.toEmbeddingModelDto(model);
    }
    if (model instanceof PermittedImageGenerationModel) {
      return this.modelResponseDtoMapper.toImageGenerationModelDto(model);
    }
    throw new Error(`Unknown model type: ${model.constructor.name}`);
  }

  @Get('permitted/language-models')
  @ApiOperation({
    summary: 'Get effective permitted language models for the current user',
    description:
      'Returns the effective set of language models for the current user, ' +
      'considering team overrides. If the user is in any team with model ' +
      "override enabled, only those teams' models are returned (union). " +
      'Otherwise, org-level models are returned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved effective language models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(PermittedLanguageModelResponseDto),
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(PermittedLanguageModelResponseDto)
  async getPermittedLanguageModels(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedLanguageModelResponseDto[]> {
    const query = new GetEffectiveLanguageModelsQuery(orgId, userId);
    const result = await this.getEffectiveLanguageModelsUseCase.execute(query);
    return result.models.map((model) =>
      this.modelResponseDtoMapper.toLanguageModelDto(model),
    );
  }

  @Get('permitted/language-models/org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get org-level permitted language models (admin view)',
    description:
      'Returns only org-scoped permitted language models, ignoring team ' +
      'overrides. Used by the admin model settings page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved org-level language models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(PermittedLanguageModelResponseDto),
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(PermittedLanguageModelResponseDto)
  async getOrgPermittedLanguageModels(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto[]> {
    const query = new GetPermittedLanguageModelsQuery(orgId);
    const models = await this.getPermittedLanguageModelsUseCase.execute(query);
    return models.map((model) =>
      this.modelResponseDtoMapper.toLanguageModelDto(model),
    );
  }

  @Get('provider/:provider')
  @ApiOperation({
    summary: 'Get model provider information',
    description:
      'Retrieves detailed information about a specific model provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved model provider information',
    schema: {
      $ref: getSchemaPath(ModelProviderInfoResponseDto),
    },
  })
  @ApiResponse({ status: 404, description: 'Model provider not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(ModelProviderInfoResponseDto)
  getModelProviderInfo(
    @Param('provider') provider: ModelProvider,
  ): ModelProviderInfoResponseDto {
    this.logger.log('getModelProviderInfo', { provider });
    const query = new GetModelProviderInfoQuery(provider);
    const entity = this.getModelProviderInfoUseCase.execute(query);
    return this.modelProviderInfoResponseDtoMapper.toDto(entity);
  }

  @Get('embedding/enabled')
  @ApiOperation({
    summary: 'Check if an embedding model is enabled for this org',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully checked embedding model status',
    schema: { $ref: getSchemaPath(EmbeddingModelEnabledResponseDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(EmbeddingModelEnabledResponseDto)
  async isEmbeddingModelEnabled(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<EmbeddingModelEnabledResponseDto> {
    const query = new IsEmbeddingModelEnabledQuery(orgId);
    const isEmbeddingModelEnabled =
      await this.isEmbeddingModelEnabledUseCase.execute(query);
    return { isEmbeddingModelEnabled };
  }
}
