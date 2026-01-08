import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Param,
  Delete,
  Put,
  Patch,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { GetAvailableModelsQuery } from '../../application/use-cases/get-available-models/get-available-models.query';
import { GetAvailableModelsUseCase } from '../../application/use-cases/get-available-models/get-available-models.use-case';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';
import { UserProperty } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { CurrentUser } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { UUID } from 'crypto';
import { GetDefaultModelQuery } from '../../application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from '../../application/use-cases/get-default-model/get-default-model.use-case';
import {
  PermittedLanguageModelResponseDto,
  PermittedLanguageModelResponseDtoNullable,
} from './dto/permitted-language-model-response.dto';
import { ModelWithConfigResponseDto } from './dto/model-with-config-response.dto';
import { ModelWithConfigResponseDtoMapper } from './mappers/model-with-config-response-dto.mapper';
import { GetPermittedModelsQuery } from '../../application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetPermittedModelsUseCase } from '../../application/use-cases/get-permitted-models/get-permitted-models.use-case';

import { CreatePermittedModelCommand } from '../../application/use-cases/create-permitted-model/create-permitted-model.command';
import { CreatePermittedModelDto } from './dto/create-permitted-model.dto';
import { CreatePermittedModelUseCase } from '../../application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.command';
import { DeletePermittedModelUseCase } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { UpdatePermittedModelCommand } from '../../application/use-cases/update-permitted-model/update-permitted-model.command';
import { UpdatePermittedModelUseCase } from '../../application/use-cases/update-permitted-model/update-permitted-model.use-case';
import { UpdatePermittedModelDto } from './dto/update-permitted-model.dto';
import { ManageUserDefaultModelUseCase } from '../../application/use-cases/manage-user-default-model/manage-user-default-model.use-case';
import { DeleteUserDefaultModelUseCase } from '../../application/use-cases/delete-user-default-model/delete-user-default-model.use-case';
import { ManageUserDefaultModelCommand } from '../../application/use-cases/manage-user-default-model/manage-user-default-model.command';
import { DeleteUserDefaultModelCommand } from '../../application/use-cases/delete-user-default-model/delete-user-default-model.command';
import { SetUserDefaultModelDto } from './dto/set-user-default-model.dto';
import { GetUserDefaultModelUseCase } from '../../application/use-cases/get-user-default-model/get-user-default-model.use-case';
import { GetUserDefaultModelQuery } from '../../application/use-cases/get-user-default-model/get-user-default-model.query';
import { GetOrgDefaultModelUseCase } from '../../application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { GetOrgDefaultModelQuery } from '../../application/use-cases/get-org-default-model/get-org-default-model.query';
import { ManageOrgDefaultModelUseCase } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.use-case';
import { ManageOrgDefaultModelCommand } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.command';
import { SetOrgDefaultModelDto } from './dto/set-org-default-model.dto';
import { GetModelProviderInfoUseCase } from '../../application/use-cases/get-model-provider-info/get-model-provider-info.use-case';
import { GetModelProviderInfoQuery } from '../../application/use-cases/get-model-provider-info/get-model-provider-info.query';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelProviderInfoResponseDto } from './dto/model-provider-info-response.dto';
import { ModelProviderInfoResponseDtoMapper } from './mappers/model-provider-info-response-dto.mapper';
import { ModelProviderInfoRegistry } from '../../application/registry/model-provider-info.registry';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetPermittedLanguageModelsQuery } from '../../application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import { GetPermittedLanguageModelsUseCase } from '../../application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { IsEmbeddingModelEnabledUseCase } from '../../application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.use-case';
import { IsEmbeddingModelEnabledQuery } from '../../application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.query';
import { EmbeddingModelEnabledResponseDto } from './dto/embedding-model-enabled-response.dto';
import { ModelNotFoundError } from '../../application/models.errors';
import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
} from '../../domain/permitted-model.entity';
import { PermittedEmbeddingModelResponseDto } from './dto/permitted-embedding-model-response.dto';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly getAvailableModelsUseCase: GetAvailableModelsUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly updatePermittedModelUseCase: UpdatePermittedModelUseCase,
    private readonly manageUserDefaultModelUseCase: ManageUserDefaultModelUseCase,
    private readonly deleteUserDefaultModelUseCase: DeleteUserDefaultModelUseCase,
    private readonly getUserDefaultModelUseCase: GetUserDefaultModelUseCase,
    private readonly getOrgDefaultModelUseCase: GetOrgDefaultModelUseCase,
    private readonly manageOrgDefaultModelUseCase: ManageOrgDefaultModelUseCase,
    private readonly getModelProviderInfoUseCase: GetModelProviderInfoUseCase,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
    private readonly modelWithConfigResponseDtoMapper: ModelWithConfigResponseDtoMapper,
    private readonly modelProviderInfoResponseDtoMapper: ModelProviderInfoResponseDtoMapper,
    private readonly getPermittedLanguageModelsUseCase: GetPermittedLanguageModelsUseCase,
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(ModelWithConfigResponseDto)
  async getAvailableModelsWithConfig(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<ModelWithConfigResponseDto[]> {
    this.logger.log('getAvailableModels');
    const query = new GetAvailableModelsQuery(orgId);
    const allAvailableModelsWithConfig =
      await this.getAvailableModelsUseCase.execute(query);
    this.logger.debug('All available models with config', {
      allAvailableModelsWithConfig,
    });
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );

    return this.modelWithConfigResponseDtoMapper.toDto(
      allAvailableModelsWithConfig,
      permittedModels,
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
  @ApiResponse({
    status: 400,
    description: 'Invalid model input',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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
      $ref: getSchemaPath(PermittedLanguageModelResponseDto),
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Permitted model not found',
  })
  @ApiExtraModels(UpdatePermittedModelDto)
  async updatePermittedModel(
    @Param('id') id: UUID,
    @Body() updatePermittedModelDto: UpdatePermittedModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<
    PermittedLanguageModelResponseDto | PermittedEmbeddingModelResponseDto
  > {
    const command = new UpdatePermittedModelCommand({
      permittedModelId: id,
      orgId,
      anonymousOnly: updatePermittedModelDto.anonymousOnly,
    });
    const model = await this.updatePermittedModelUseCase.execute(command);
    if (model instanceof PermittedLanguageModel) {
      return this.modelResponseDtoMapper.toLanguageModelDto(model);
    } else if (model instanceof PermittedEmbeddingModel) {
      return this.modelResponseDtoMapper.toEmbeddingModelDto(model);
    }
    throw new Error(`Unknown model type: ${model.constructor.name}`);
  }

  @Get('permitted/language-models')
  @ApiOperation({ summary: 'Get all permitted language models' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all permitted language models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(PermittedLanguageModelResponseDto),
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(PermittedLanguageModelResponseDto)
  async getPermittedLanguageModels(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto[]> {
    const query = new GetPermittedLanguageModelsQuery(orgId);
    const models = await this.getPermittedLanguageModelsUseCase.execute(query);
    return models.map((model) =>
      this.modelResponseDtoMapper.toLanguageModelDto(model),
    );
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get the effective default model for the user',
    description:
      'Returns the applicable default model with fallback hierarchy: User default → Org default → First available model',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the effective default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDtoNullable),
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(PermittedLanguageModelResponseDtoNullable)
  async getEffectiveDefaultModel(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedLanguageModelResponseDtoNullable> {
    try {
      const query = new GetDefaultModelQuery({ orgId, userId });
      const model = await this.getDefaultModelUseCase.execute(query);
      return {
        permittedLanguageModel:
          this.modelResponseDtoMapper.toLanguageModelDto(model),
      };
    } catch (error) {
      if (error instanceof ModelNotFoundError) {
        return { permittedLanguageModel: undefined };
      }
      this.logger.error('Failed to get effective default model', {
        orgId,
        userId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }

  @Get('org/default')
  @ApiOperation({
    summary: 'Get the organization default model',
    description:
      "Returns only the organization's specific default model. Returns null if no org default is set.",
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the organization default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDtoNullable),
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(PermittedLanguageModelResponseDtoNullable)
  async getOrgSpecificDefaultModel(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDtoNullable> {
    const query = new GetOrgDefaultModelQuery(orgId);
    const model = await this.getOrgDefaultModelUseCase.execute(query);
    if (!model) {
      return { permittedLanguageModel: undefined };
    }
    return {
      permittedLanguageModel:
        this.modelResponseDtoMapper.toLanguageModelDto(model),
    };
  }

  @Get('user/default')
  @ApiOperation({
    summary: 'Get the user-specific default model',
    description:
      "Returns the user's personal default model only. Returns null if no user-specific default is set.",
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the user-specific default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDtoNullable),
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(PermittedLanguageModelResponseDtoNullable)
  async getUserSpecificDefaultModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedLanguageModelResponseDtoNullable> {
    const query = new GetUserDefaultModelQuery(userId);
    const model = await this.getUserDefaultModelUseCase.execute(query);

    if (!model) {
      return { permittedLanguageModel: undefined };
    }

    return {
      permittedLanguageModel:
        this.modelResponseDtoMapper.toLanguageModelDto(model),
    };
  }

  @Put('user/default')
  @ApiOperation({
    summary: 'Set or update the user default model',
    description:
      'Sets the specified permitted model as the user default. If a default already exists, it will be updated to the new model.',
  })
  @ApiBody({ type: SetUserDefaultModelDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully set or updated the user default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 404,
    description: 'Permitted model not found',
  })
  @ApiExtraModels(SetUserDefaultModelDto)
  async manageUserDefaultModel(
    @Body() setUserDefaultModelDto: SetUserDefaultModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedLanguageModelResponseDto> {
    const command = new ManageUserDefaultModelCommand(
      userId,
      setUserDefaultModelDto.permittedModelId,
      orgId,
    );
    const model = await this.manageUserDefaultModelUseCase.execute(command);
    return this.modelResponseDtoMapper.toLanguageModelDto(model);
  }

  @Delete('user/default')
  @ApiOperation({ summary: 'Delete the user default model' })
  @ApiResponse({
    status: 204,
    description: 'Successfully deleted the user default model',
  })
  @ApiResponse({
    status: 404,
    description: 'User default model not found',
  })
  async deleteUserDefaultModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    const command = new DeleteUserDefaultModelCommand(userId);
    await this.deleteUserDefaultModelUseCase.execute(command);
  }

  @Put('org/default')
  @ApiOperation({
    summary: 'Set or update the organization default model',
    description:
      'Sets the specified permitted model as the organization default. If a default already exists, it will be updated to the new model.',
  })
  @ApiBody({ type: SetOrgDefaultModelDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully set or updated the organization default model',
    schema: {
      $ref: getSchemaPath(PermittedLanguageModelResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 404,
    description: 'Permitted model not found',
  })
  @ApiExtraModels(SetOrgDefaultModelDto)
  async manageOrgDefaultModel(
    @Body() setOrgDefaultModelDto: SetOrgDefaultModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto> {
    const command = new ManageOrgDefaultModelCommand(
      setOrgDefaultModelDto.permittedModelId,
      orgId,
    );
    const model = await this.manageOrgDefaultModelUseCase.execute(command);
    return this.modelResponseDtoMapper.toLanguageModelDto(model);
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
  @ApiResponse({
    status: 404,
    description: 'Model provider not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
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

  /**
   * TODO: Implement with model and provider as input
   */
  // @Post('inference')
  // @ApiOperation({ summary: 'Trigger inference' })
  // @ApiBody({ type: InferenceRequestDto })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Successfully triggered inference and returned model response',
  //   schema: {
  //     $ref: getSchemaPath(InferenceResponse),
  //   },
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Invalid inference request payload',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Model not found',
  // })
  // @ApiResponse({
  //   status: 500,
  //   description: 'Internal server error or model provider error',
  // })
  // @ApiExtraModels(
  //   InferenceResponse,
  //   ToolSpecificationDto,
  //   UserMessageRequestDto,
  //   SystemMessageRequestDto,
  //   AssistantMessageRequestDto,
  //   ToolResultMessageRequestDto,
  //   TextMessageContentRequestDto,
  //   ToolUseMessageContentRequestDto,
  //   ToolResultMessageContentRequestDto,
  // )
  // async inference(
  //   @Body() inferenceRequestDto: InferenceRequestDto,
  //   @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  // ): Promise<InferenceResponse> {
  //   this.logger.log('inference', inferenceRequestDto);
  //   const getModelQuery = new GetPermittedModelByNameAndProviderQuery({
  //     name: inferenceRequestDto.modelName,
  //     provider: inferenceRequestDto.modelProvider,
  //     orgId,
  //   });
  //   const model = await this.getPermittedModelUseCase.execute(getModelQuery);

  //   // Create CustomTool entities from tool specifications
  //   const tools: Tool[] = [];
  //   if (inferenceRequestDto.tools && inferenceRequestDto.tools.length > 0) {
  //     for (const toolSpec of inferenceRequestDto.tools) {
  //       const createToolCommand = new CreateCustomToolCommand(
  //         toolSpec.name,
  //         toolSpec.description,
  //         toolSpec.parameters,
  //       );
  //       const customTool =
  //         await this.createCustomToolUseCase.execute(createToolCommand);
  //       tools.push(customTool);
  //     }
  //   }

  //   // Convert MessageRequestDto[] to Message[]
  //   const messages = this.messageRequestDtoMapper.fromDtoArray(
  //     inferenceRequestDto.messages,
  //   );

  //   const inferenceCommand = new GetInferenceCommand({
  //     model: model.model,
  //     messages: messages,
  //     tools: tools,
  //     toolChoice: inferenceRequestDto.toolChoice || ModelToolChoice.AUTO,
  //   });

  //   return await this.triggerInferenceUseCase.execute(inferenceCommand);
  // }
}
