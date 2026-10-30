import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';
import { GetDefaultModelSelectionUseCase } from 'src/domain/models/application/use-cases/get-default-model-selection/get-default-model-selection.use-case';
import { GetModelModeDefaultUseCase } from 'src/domain/models/application/use-cases/get-model-mode-default/get-model-mode-default.use-case';
import { GetModelModeDefaultQuery } from 'src/domain/models/application/use-cases/get-model-mode-default/get-model-mode-default.query';
import { SetModelModeDefaultUseCase } from 'src/domain/models/application/use-cases/set-model-mode-default/set-model-mode-default.use-case';
import { SetModelModeDefaultCommand } from 'src/domain/models/application/use-cases/set-model-mode-default/set-model-mode-default.command';
import {
  DefaultModelSelectionResponseDto,
  ModelModeDefaultResponseDto,
  SetModelModeDefaultDto,
} from './dto/model-mode-default.dto';

@ApiTags('models')
@Controller('models')
export class ModelModeDefaultsController {
  constructor(
    private readonly getDefaultModelSelectionUseCase: GetDefaultModelSelectionUseCase,
    private readonly getModelModeDefaultUseCase: GetModelModeDefaultUseCase,
    private readonly setModelModeDefaultUseCase: SetModelModeDefaultUseCase,
  ) {}

  @Get('default-selection')
  @ApiOperation({
    summary: "What a new chat preselects: the caller's default mode or model",
  })
  @ApiOkResponse({ type: DefaultModelSelectionResponseDto })
  async getDefaultSelection(): Promise<DefaultModelSelectionResponseDto> {
    const selection = await this.getDefaultModelSelectionUseCase.execute();
    return {
      mode: selection.mode,
      permittedModelId: selection.permittedModel.id,
    };
  }

  @Get('mode-defaults/user')
  @ApiOperation({ summary: "Get the caller's personal default mode" })
  @ApiOkResponse({ type: ModelModeDefaultResponseDto })
  getUserModeDefault(): Promise<ModelModeDefaultResponseDto> {
    return this.get(ModelModeDefaultLevel.USER);
  }

  @Put('mode-defaults/user')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set or clear the caller's personal default mode" })
  @ApiNoContentResponse()
  setUserModeDefault(@Body() dto: SetModelModeDefaultDto): Promise<void> {
    return this.set(ModelModeDefaultLevel.USER, dto);
  }

  @Get('mode-defaults/org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get the organization's default mode" })
  @ApiOkResponse({ type: ModelModeDefaultResponseDto })
  getOrgModeDefault(): Promise<ModelModeDefaultResponseDto> {
    return this.get(ModelModeDefaultLevel.ORG);
  }

  @Put('mode-defaults/org')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set or clear the organization's default mode" })
  @ApiNoContentResponse()
  setOrgModeDefault(@Body() dto: SetModelModeDefaultDto): Promise<void> {
    return this.set(ModelModeDefaultLevel.ORG, dto);
  }

  @Get('mode-defaults/teams/:teamId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get a team's default mode" })
  @ApiOkResponse({ type: ModelModeDefaultResponseDto })
  getTeamModeDefault(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<ModelModeDefaultResponseDto> {
    return this.get(ModelModeDefaultLevel.TEAM, teamId);
  }

  @Put('mode-defaults/teams/:teamId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set or clear a team's default mode" })
  @ApiNoContentResponse()
  setTeamModeDefault(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetModelModeDefaultDto,
  ): Promise<void> {
    return this.set(ModelModeDefaultLevel.TEAM, dto, teamId);
  }

  private async get(
    level: ModelModeDefaultLevel,
    teamId?: UUID,
  ): Promise<ModelModeDefaultResponseDto> {
    const result = await this.getModelModeDefaultUseCase.execute(
      new GetModelModeDefaultQuery(level, teamId),
    );
    return {
      mode: result.mode,
      currentPermittedModelId: result.currentPermittedModel?.id ?? null,
      availableModes: result.availableModes,
    };
  }

  private set(
    level: ModelModeDefaultLevel,
    dto: SetModelModeDefaultDto,
    teamId?: UUID,
  ): Promise<void> {
    return this.setModelModeDefaultUseCase.execute(
      new SetModelModeDefaultCommand(level, dto.mode, teamId),
    );
  }
}
