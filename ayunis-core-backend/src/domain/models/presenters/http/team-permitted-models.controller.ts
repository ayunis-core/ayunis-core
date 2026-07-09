import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  UserProperty,
  CurrentUser,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetTeamPermittedModelsUseCase } from '../../application/use-cases/get-team-permitted-models/get-team-permitted-models.use-case';
import { GetTeamPermittedModelsQuery } from '../../application/use-cases/get-team-permitted-models/get-team-permitted-models.query';
import { GetTeamPermittedImageGenerationModelsUseCase } from '../../application/use-cases/get-team-permitted-image-generation-models/get-team-permitted-image-generation-models.use-case';
import { GetTeamPermittedImageGenerationModelsQuery } from '../../application/use-cases/get-team-permitted-image-generation-models/get-team-permitted-image-generation-models.query';
import { CreateTeamPermittedModelUseCase } from '../../application/use-cases/create-team-permitted-model/create-team-permitted-model.use-case';
import { CreateTeamPermittedModelCommand } from '../../application/use-cases/create-team-permitted-model/create-team-permitted-model.command';
import { DeleteTeamPermittedModelUseCase } from '../../application/use-cases/delete-team-permitted-model/delete-team-permitted-model.use-case';
import { DeleteTeamPermittedModelCommand } from '../../application/use-cases/delete-team-permitted-model/delete-team-permitted-model.command';
import { UpdateTeamPermittedModelUseCase } from '../../application/use-cases/update-team-permitted-model/update-team-permitted-model.use-case';
import { UpdateTeamPermittedModelCommand } from '../../application/use-cases/update-team-permitted-model/update-team-permitted-model.command';
import { SetTeamDefaultModelUseCase } from '../../application/use-cases/set-team-default-model/set-team-default-model.use-case';
import { SetTeamDefaultModelCommand } from '../../application/use-cases/set-team-default-model/set-team-default-model.command';
import { CreateTeamPermittedModelDto } from './dto/create-team-permitted-model.dto';
import { UpdatePermittedModelDto } from './dto/update-permitted-model.dto';
import { SetTeamDefaultModelDto } from './dto/set-team-default-model.dto';
import { PermittedLanguageModelResponseDto } from './dto/permitted-language-model-response.dto';
import { PermittedImageGenerationModelResponseDto } from './dto/permitted-image-generation-model-response.dto';
import {
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from '../../domain/permitted-model.entity';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';

@ApiTags('team-permitted-models')
@Controller('teams/:teamId/permitted-models')
@Roles(UserRole.ADMIN)
@ApiExtraModels(
  CreateTeamPermittedModelDto,
  UpdatePermittedModelDto,
  SetTeamDefaultModelDto,
  PermittedLanguageModelResponseDto,
  PermittedImageGenerationModelResponseDto,
)
export class TeamPermittedModelsController {
  private readonly logger = new Logger(TeamPermittedModelsController.name);

  constructor(
    private readonly getTeamPermittedModelsUseCase: GetTeamPermittedModelsUseCase,
    private readonly getTeamPermittedImageGenerationModelsUseCase: GetTeamPermittedImageGenerationModelsUseCase,
    private readonly createTeamPermittedModelUseCase: CreateTeamPermittedModelUseCase,
    private readonly deleteTeamPermittedModelUseCase: DeleteTeamPermittedModelUseCase,
    private readonly updateTeamPermittedModelUseCase: UpdateTeamPermittedModelUseCase,
    private readonly setTeamDefaultModelUseCase: SetTeamDefaultModelUseCase,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List a team's permitted language models",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved team's permitted language models",
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
    },
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async listTeamPermittedModels(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto[]> {
    this.logger.log('listTeamPermittedModels', { teamId });
    const query = new GetTeamPermittedModelsQuery(teamId, orgId);
    const models = await this.getTeamPermittedModelsUseCase.execute(query);
    return models.map((model) =>
      this.modelResponseDtoMapper.toLanguageModelDto(model),
    );
  }

  @Get('image-generation')
  @ApiOperation({
    summary: "List a team's permitted image-generation models",
  })
  @ApiResponse({
    status: 200,
    description:
      "Successfully retrieved team's permitted image-generation models",
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(PermittedImageGenerationModelResponseDto),
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async listTeamImageGenerationModels(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedImageGenerationModelResponseDto[]> {
    this.logger.log('listTeamImageGenerationModels', { teamId });
    const query = new GetTeamPermittedImageGenerationModelsQuery(teamId, orgId);
    const models =
      await this.getTeamPermittedImageGenerationModelsUseCase.execute(query);
    return models.map((model) =>
      this.modelResponseDtoMapper.toImageGenerationModelDto(model),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Add a permitted model to a team',
    description:
      'Creates a team-scoped permitted model. The model must already ' +
      'be permitted at the organization level.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully added permitted model to team',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
        { $ref: getSchemaPath(PermittedImageGenerationModelResponseDto) },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or model not org-permitted',
  })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({
    status: 409,
    description: 'Model already permitted for this team',
  })
  async createTeamPermittedModel(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: CreateTeamPermittedModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<
    PermittedLanguageModelResponseDto | PermittedImageGenerationModelResponseDto
  > {
    this.logger.log('createTeamPermittedModel', {
      teamId,
      modelId: dto.modelId,
    });
    const command = new CreateTeamPermittedModelCommand(
      dto.modelId,
      orgId,
      teamId,
      dto.anonymousOnly,
    );
    const created = await this.createTeamPermittedModelUseCase.execute(command);
    return this.toTeamPermittedModelDto(created);
  }

  private toTeamPermittedModelDto(
    created: PermittedModel,
  ):
    | PermittedLanguageModelResponseDto
    | PermittedImageGenerationModelResponseDto {
    if (created instanceof PermittedImageGenerationModel) {
      return this.modelResponseDtoMapper.toImageGenerationModelDto(created);
    }
    if (created instanceof PermittedLanguageModel) {
      return this.modelResponseDtoMapper.toLanguageModelDto(created);
    }
    throw new Error(
      `Unexpected permitted model type: ${created.constructor.name}`,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Update a team's permitted model",
    description:
      'Updates a team-scoped permitted model, e.g. toggling whether it ' +
      'enforces anonymous mode for members of the team.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated team permitted model',
    schema: { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
  })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
  async updateTeamPermittedModel(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdatePermittedModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto> {
    this.logger.log('updateTeamPermittedModel', {
      teamId,
      permittedModelId: id,
      anonymousOnly: dto.anonymousOnly,
    });
    const command = new UpdateTeamPermittedModelCommand(
      id,
      orgId,
      teamId,
      dto.anonymousOnly,
    );
    const updated = await this.updateTeamPermittedModelUseCase.execute(command);
    return this.modelResponseDtoMapper.toLanguageModelDto(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a permitted model from a team',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully removed permitted model from team',
  })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
  async deleteTeamPermittedModel(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    this.logger.log('deleteTeamPermittedModel', {
      teamId,
      permittedModelId: id,
    });
    const command = new DeleteTeamPermittedModelCommand(id, orgId, teamId);
    await this.deleteTeamPermittedModelUseCase.execute(command);
  }

  @Put('default')
  @ApiOperation({
    summary: "Set the team's default model",
    description:
      'Sets the specified team-scoped permitted model as the default ' +
      'model for the team.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully set team default model',
    schema: { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
  })
  @ApiResponse({ status: 404, description: 'Permitted model not found' })
  async setTeamDefaultModel(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetTeamDefaultModelDto,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<PermittedLanguageModelResponseDto> {
    this.logger.log('setTeamDefaultModel', {
      teamId,
      permittedModelId: dto.permittedModelId,
    });
    const command = new SetTeamDefaultModelCommand(
      dto.permittedModelId,
      orgId,
      teamId,
    );
    const model = await this.setTeamDefaultModelUseCase.execute(command);
    return this.modelResponseDtoMapper.toLanguageModelDto(model);
  }
}
