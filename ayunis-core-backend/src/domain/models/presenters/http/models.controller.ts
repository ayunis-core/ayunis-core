import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { InferenceRequestDto } from './dto/inference-request.dto';
import { GetInferenceCommand } from '../../application/use-cases/get-inference/get-inference.command';
import { GetAvailableModelsQuery } from '../../application/use-cases/get-available-models/get-available-models.query';
import { ModelToolChoice } from '../../application/enums/model-tool-choice.enum';
import { GetInferenceUseCase } from '../../application/use-cases/get-inference/get-inference.use-case';
import { GetAvailableModelsUseCase } from '../../application/use-cases/get-available-models/get-available-models.use-case';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';
import { UserProperty } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { CurrentUser } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { UUID } from 'crypto';
import { GetDefaultModelQuery } from '../../application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from '../../application/use-cases/get-default-model/get-default-model.use-case';
import { PermittedModelResponseDto } from './dto/permitted-model-response.dto';
import { ModelWithConfigResponseDto } from './dto/model-with-config-response.dto';
import { ModelWithConfigResponseDtoMapper } from './mappers/model-with-config-response-dto.mapper';
import { GetPermittedModelsQuery } from '../../application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetPermittedModelsUseCase } from '../../application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelByNameAndProviderQuery } from '../../application/use-cases/get-permitted-model/get-permitted-model.query';
import { GetPermittedModelUseCase } from '../../application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { InferenceResponse } from '../../application/ports/inference.handler';
import { CreatePermittedModelCommand } from '../../application/use-cases/create-permitted-model/create-permitted-model.command';
import { CreatePermittedModelDto } from './dto/create-permitted-model.dto';
import { CreatePermittedModelUseCase } from '../../application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { GetAvailableModelQuery } from '../../application/use-cases/get-available-model/get-available-model.query';
import { GetAvailableModelUseCase } from '../../application/use-cases/get-available-model/get-available-model.use-case';
import { DeletePermittedModelCommand } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.command';
import { DeletePermittedModelUseCase } from '../../application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
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
import { CreateCustomToolUseCase } from 'src/domain/tools/application/use-cases/create-custom-tool/create-custom-tool.use-case';
import { CreateCustomToolCommand } from 'src/domain/tools/application/use-cases/create-custom-tool/create-custom-tool.command';
import {
  ToolSpecificationDto,
  UserMessageRequestDto,
  SystemMessageRequestDto,
  AssistantMessageRequestDto,
  ToolResultMessageRequestDto,
  TextMessageContentRequestDto,
  ToolUseMessageContentRequestDto,
  ToolResultMessageContentRequestDto,
} from './dto/inference-request.dto';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { MessageRequestDtoMapper } from './mappers/message-request-dto.mapper';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly getAvailableModelUseCase: GetAvailableModelUseCase,
    private readonly getAvailableModelsUseCase: GetAvailableModelsUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly manageUserDefaultModelUseCase: ManageUserDefaultModelUseCase,
    private readonly deleteUserDefaultModelUseCase: DeleteUserDefaultModelUseCase,
    private readonly getUserDefaultModelUseCase: GetUserDefaultModelUseCase,
    private readonly getOrgDefaultModelUseCase: GetOrgDefaultModelUseCase,
    private readonly manageOrgDefaultModelUseCase: ManageOrgDefaultModelUseCase,
    private readonly createCustomToolUseCase: CreateCustomToolUseCase,
    private readonly messageRequestDtoMapper: MessageRequestDtoMapper,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
    private readonly modelWithConfigResponseDtoMapper: ModelWithConfigResponseDtoMapper,
  ) {}

  @Get('available')
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
      this.getAvailableModelsUseCase.execute(query);
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

  @Post('permitted')
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
    );
    await this.createPermittedModelUseCase.execute(command);
  }

  @Get('permitted')
  @ApiOperation({ summary: 'Get all permitted models' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all permitted models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(PermittedModelResponseDto),
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiExtraModels(PermittedModelResponseDto)
  async getPermittedModels(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedModelResponseDto[]> {
    const query = new GetPermittedModelsQuery(orgId);
    const models = await this.getPermittedModelsUseCase.execute(query);
    const permittedModelResponse = models.map((model) => {
      const modelWithConfig = this.getAvailableModelUseCase.execute(
        new GetAvailableModelQuery(model.model.id),
      );
      return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
    });
    return permittedModelResponse;
  }

  @Delete('permitted/:id')
  @ApiOperation({ summary: 'Delete a permitted model' })
  @ApiResponse({
    status: 200,
    description: 'Successfully deleted a permitted model',
  })
  async deletePermittedModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    const command = new DeletePermittedModelCommand(orgId, id);
    await this.deletePermittedModelUseCase.execute(command);
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
      $ref: getSchemaPath(PermittedModelResponseDto),
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No default model found',
  })
  async getEffectiveDefaultModel(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedModelResponseDto> {
    const query = new GetDefaultModelQuery(orgId, userId);
    const model = await this.getDefaultModelUseCase.execute(query);
    const modelWithConfig = this.getAvailableModelUseCase.execute(
      new GetAvailableModelQuery(model.model.id),
    );
    return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
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
      $ref: getSchemaPath(PermittedModelResponseDto),
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No organization default model found',
  })
  async getOrgSpecificDefaultModel(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedModelResponseDto | null> {
    const query = new GetOrgDefaultModelQuery(orgId);
    const model = await this.getOrgDefaultModelUseCase.execute(query);

    if (!model) {
      return null;
    }

    const modelWithConfig = this.getAvailableModelUseCase.execute(
      new GetAvailableModelQuery(model.model.id),
    );
    return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
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
      $ref: getSchemaPath(PermittedModelResponseDto),
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No user-specific default model found',
  })
  async getUserSpecificDefaultModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PermittedModelResponseDto | null> {
    const query = new GetUserDefaultModelQuery(userId);
    const model = await this.getUserDefaultModelUseCase.execute(query);

    if (!model) {
      return null;
    }

    const modelWithConfig = this.getAvailableModelUseCase.execute(
      new GetAvailableModelQuery(model.model.id),
    );
    return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
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
      $ref: getSchemaPath(PermittedModelResponseDto),
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
  ): Promise<PermittedModelResponseDto> {
    const command = new ManageUserDefaultModelCommand(
      userId,
      setUserDefaultModelDto.permittedModelId,
      orgId,
    );
    const model = await this.manageUserDefaultModelUseCase.execute(command);
    const modelWithConfig = this.getAvailableModelUseCase.execute(
      new GetAvailableModelQuery(model.model.id),
    );
    return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
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
      $ref: getSchemaPath(PermittedModelResponseDto),
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
  ): Promise<PermittedModelResponseDto> {
    const command = new ManageOrgDefaultModelCommand(
      setOrgDefaultModelDto.permittedModelId,
      orgId,
    );
    const model = await this.manageOrgDefaultModelUseCase.execute(command);
    const modelWithConfig = this.getAvailableModelUseCase.execute(
      new GetAvailableModelQuery(model.model.id),
    );
    return this.modelResponseDtoMapper.toDto(modelWithConfig, model);
  }

  @Post('inference')
  @ApiOperation({ summary: 'Trigger inference' })
  @ApiBody({ type: InferenceRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully triggered inference and returned model response',
    schema: {
      $ref: getSchemaPath(InferenceResponse),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid inference request payload',
  })
  @ApiResponse({
    status: 404,
    description: 'Model not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or model provider error',
  })
  @ApiExtraModels(
    InferenceResponse,
    ToolSpecificationDto,
    UserMessageRequestDto,
    SystemMessageRequestDto,
    AssistantMessageRequestDto,
    ToolResultMessageRequestDto,
    TextMessageContentRequestDto,
    ToolUseMessageContentRequestDto,
    ToolResultMessageContentRequestDto,
  )
  async inference(
    @Body() inferenceRequestDto: InferenceRequestDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<InferenceResponse> {
    this.logger.log('inference', inferenceRequestDto);
    const getModelQuery = new GetPermittedModelByNameAndProviderQuery({
      name: inferenceRequestDto.modelName,
      provider: inferenceRequestDto.modelProvider,
      orgId,
    });
    const model = await this.getPermittedModelUseCase.execute(getModelQuery);

    // Create CustomTool entities from tool specifications
    const tools: Tool[] = [];
    if (inferenceRequestDto.tools && inferenceRequestDto.tools.length > 0) {
      for (const toolSpec of inferenceRequestDto.tools) {
        const createToolCommand = new CreateCustomToolCommand(
          toolSpec.name,
          toolSpec.description,
          toolSpec.parameters,
        );
        const customTool =
          await this.createCustomToolUseCase.execute(createToolCommand);
        tools.push(customTool);
      }
    }

    // Convert MessageRequestDto[] to Message[]
    const messages = this.messageRequestDtoMapper.fromDtoArray(
      inferenceRequestDto.messages,
    );

    const inferenceCommand = new GetInferenceCommand({
      model: model.model,
      messages: messages,
      tools: tools,
      toolChoice: inferenceRequestDto.toolChoice || ModelToolChoice.AUTO,
    });

    return await this.triggerInferenceUseCase.execute(inferenceCommand);
  }
}
