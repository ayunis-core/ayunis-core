import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import {
  removeUploadedFile,
  SOURCE_FILE_API_BODY,
  SOURCE_FILE_UPLOAD_OPTIONS,
  type UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import { FeatureFlag } from 'src/config/features.config';
import { MissingFileError } from 'src/domain/skills/application/skills.errors';
import { AddWorkspaceSkillFileUseCase } from 'src/domain/workspaces/application/use-cases/add-workspace-skill-file/add-workspace-skill-file.use-case';
import { ListWorkspaceSkillSourcesUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-skill-sources/list-workspace-skill-sources.use-case';
import { RemoveWorkspaceSkillSourceUseCase } from 'src/domain/workspaces/application/use-cases/remove-workspace-skill-source/remove-workspace-skill-source.use-case';
import { SkillSourceResponseDto } from 'src/domain/skills/presenters/http/dto/skill-response.dto';
import { SkillDtoMapper } from 'src/domain/skills/presenters/http/mappers/skill.mapper';
import { WorkspaceSkillResponseDto } from './dtos/workspace-context-response.dto';
import { WorkspaceContextDtoMapper } from './mappers/workspace-context-dto.mapper';

@ApiTags('workspaces')
@Controller('workspaces/:id/context/skills/:skillId/sources')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceSkillSourcesController {
  constructor(
    private readonly addFileUseCase: AddWorkspaceSkillFileUseCase,
    private readonly listSources: ListWorkspaceSkillSourcesUseCase,
    private readonly removeSource: RemoveWorkspaceSkillSourceUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly contextDtoMapper: WorkspaceContextDtoMapper,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: [SkillSourceResponseDto] })
  async list(
    @Param('id', ParseUUIDPipe) workspaceId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<SkillSourceResponseDto[]> {
    const sources = await this.listSources.execute({ workspaceId, skillId });
    return this.skillDtoMapper.sourcesToDtoArray(sources);
  }

  @Post('file')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @UseInterceptors(FileInterceptor('file', SOURCE_FILE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiBody(SOURCE_FILE_API_BODY)
  @ApiParam({ name: 'skillId', type: String, format: 'uuid' })
  @ApiResponse({ status: 201, type: WorkspaceSkillResponseDto })
  async addFile(
    @Param('id', ParseUUIDPipe) workspaceId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<WorkspaceSkillResponseDto> {
    if (!file) throw new MissingFileError();

    try {
      const context = await this.addFileUseCase.execute({
        workspaceId,
        skillId,
        file,
      });
      return this.contextDtoMapper.toSkillDto(context);
    } finally {
      removeUploadedFile(file.path);
    }
  }

  @Delete(':sourceId')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) workspaceId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    await this.removeSource.execute({ workspaceId, skillId, sourceId });
  }
}
