import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { GetModelModeEntriesUseCase } from 'src/domain/models/application/use-cases/get-model-mode-entries/get-model-mode-entries.use-case';
import { GetModelModeEntriesQuery } from 'src/domain/models/application/use-cases/get-model-mode-entries/get-model-mode-entries.query';
import { ReplaceModelModeEntriesUseCase } from 'src/domain/models/application/use-cases/replace-model-mode-entries/replace-model-mode-entries.use-case';
import { ReplaceModelModeEntriesCommand } from 'src/domain/models/application/use-cases/replace-model-mode-entries/replace-model-mode-entries.command';
import {
  ModelModeEntryDto,
  ReplaceModelModeEntriesDto,
} from './dto/model-mode-entry.dto';

const modeParam = new ParseEnumPipe(ModelMode);

@ApiTags('Super Admin Models')
@Controller('super-admin/model-modes')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminModelModesController {
  constructor(
    private readonly getModelModeEntriesUseCase: GetModelModeEntriesUseCase,
    private readonly replaceModelModeEntriesUseCase: ReplaceModelModeEntriesUseCase,
  ) {}

  @Get(':mode')
  @ApiOperation({ summary: 'Get the ordered model list of a mode' })
  @ApiParam({ name: 'mode', enum: ModelMode })
  @ApiOkResponse({ type: [ModelModeEntryDto] })
  async getEntries(
    @Param('mode', modeParam) mode: ModelMode,
  ): Promise<ModelModeEntryDto[]> {
    const entries = await this.getModelModeEntriesUseCase.execute(
      new GetModelModeEntriesQuery(mode),
    );
    return entries.map((e) => ({ modelId: e.model.id, enabled: e.enabled }));
  }

  @Put(':mode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Replace the ordered model list of a mode',
    description:
      'Max mode only accepts high-tier language models. Applies to chats created afterwards.',
  })
  @ApiParam({ name: 'mode', enum: ModelMode })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description: 'Unknown, non-language or disallowed-tier model',
  })
  async replaceEntries(
    @Param('mode', modeParam) mode: ModelMode,
    @Body() body: ReplaceModelModeEntriesDto,
  ): Promise<void> {
    await this.replaceModelModeEntriesUseCase.execute(
      new ReplaceModelModeEntriesCommand(mode, body.entries),
    );
  }
}
