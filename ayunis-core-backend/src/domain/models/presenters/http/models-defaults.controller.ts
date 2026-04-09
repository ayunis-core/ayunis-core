import { Body, Controller, Delete, Get, Logger, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { DeleteUserDefaultModelUseCase } from '../../application/use-cases/delete-user-default-model/delete-user-default-model.use-case';
import { DeleteUserDefaultModelCommand } from '../../application/use-cases/delete-user-default-model/delete-user-default-model.command';
import { GetDefaultModelUseCase } from '../../application/use-cases/get-default-model/get-default-model.use-case';
import { GetDefaultModelQuery } from '../../application/use-cases/get-default-model/get-default-model.query';
import { GetOrgDefaultModelUseCase } from '../../application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { GetOrgDefaultModelQuery } from '../../application/use-cases/get-org-default-model/get-org-default-model.query';
import { GetUserDefaultModelUseCase } from '../../application/use-cases/get-user-default-model/get-user-default-model.use-case';
import { GetUserDefaultModelQuery } from '../../application/use-cases/get-user-default-model/get-user-default-model.query';
import { ManageOrgDefaultModelUseCase } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.use-case';
import { ManageOrgDefaultModelCommand } from '../../application/use-cases/manage-org-default-model/manage-org-default-model.command';
import { ManageUserDefaultModelUseCase } from '../../application/use-cases/manage-user-default-model/manage-user-default-model.use-case';
import { ManageUserDefaultModelCommand } from '../../application/use-cases/manage-user-default-model/manage-user-default-model.command';
import { ModelNotFoundError } from '../../application/models.errors';
import {
  PermittedLanguageModelResponseDto,
  PermittedLanguageModelResponseDtoNullable,
} from './dto/permitted-language-model-response.dto';
import { SetOrgDefaultModelDto } from './dto/set-org-default-model.dto';
import { SetUserDefaultModelDto } from './dto/set-user-default-model.dto';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';

@ApiTags('models')
@Controller('models')
export class ModelsDefaultsController {
  private readonly logger = new Logger(ModelsDefaultsController.name);

  constructor(
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly manageUserDefaultModelUseCase: ManageUserDefaultModelUseCase,
    private readonly deleteUserDefaultModelUseCase: DeleteUserDefaultModelUseCase,
    private readonly getUserDefaultModelUseCase: GetUserDefaultModelUseCase,
    private readonly getOrgDefaultModelUseCase: GetOrgDefaultModelUseCase,
    private readonly manageOrgDefaultModelUseCase: ManageOrgDefaultModelUseCase,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
  ) {}

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
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
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
  @ApiResponse({ status: 404, description: 'User default model not found' })
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
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
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
}
