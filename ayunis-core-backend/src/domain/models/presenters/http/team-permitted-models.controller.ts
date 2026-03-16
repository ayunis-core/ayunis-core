import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
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
import { CreateTeamPermittedModelUseCase } from '../../application/use-cases/create-team-permitted-model/create-team-permitted-model.use-case';
import { CreateTeamPermittedModelCommand } from '../../application/use-cases/create-team-permitted-model/create-team-permitted-model.command';
import { DeleteTeamPermittedModelUseCase } from '../../application/use-cases/delete-team-permitted-model/delete-team-permitted-model.use-case';
import { DeleteTeamPermittedModelCommand } from '../../application/use-cases/delete-team-permitted-model/delete-team-permitted-model.command';
import { SetTeamDefaultModelUseCase } from '../../application/use-cases/set-team-default-model/set-team-default-model.use-case';
import { SetTeamDefaultModelCommand } from '../../application/use-cases/set-team-default-model/set-team-default-model.command';
import { CreateTeamPermittedModelDto } from './dto/create-team-permitted-model.dto';
import { SetTeamDefaultModelDto } from './dto/set-team-default-model.dto';
import { PermittedLanguageModelResponseDto } from './dto/permitted-language-model-response.dto';
import { PermittedLanguageModel } from '../../domain/permitted-model.entity';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';

@ApiTags('team-permitted-models')
@Controller('teams/:teamId/permitted-models')
@Roles(UserRole.ADMIN)
@ApiExtraModels(
  CreateTeamPermittedModelDto,
  SetTeamDefaultModelDto,
  PermittedLanguageModelResponseDto,
)
export class TeamPermittedModelsController {
  private readonly logger = new Logger(TeamPermittedModelsController.name);

  constructor(
    private readonly getTeamPermittedModelsUseCase: GetTeamPermittedModelsUseCase,
    private readonly createTeamPermittedModelUseCase: CreateTeamPermittedModelUseCase,
    private readonly deleteTeamPermittedModelUseCase: DeleteTeamPermittedModelUseCase,
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
    schema: { $ref: getSchemaPath(PermittedLanguageModelResponseDto) },
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
  ): Promise<PermittedLanguageModelResponseDto> {
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
    if (!(created instanceof PermittedLanguageModel)) {
      throw new Error(
        `Expected PermittedLanguageModel but got ${created.constructor.name}`,
      );
    }
    return this.modelResponseDtoMapper.toLanguageModelDto(created);
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
