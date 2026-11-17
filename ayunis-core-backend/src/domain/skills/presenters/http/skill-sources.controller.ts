import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RemoveSourceFromSkillUseCase } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.use-case';

import { RemoveSourceFromSkillCommand } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.query';

import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';

import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

import {
  removeUploadedFile,
  UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import { ApiSkillFileSourceUpload } from './decorators/skill-sources.decorators';

import { MissingFileError } from 'src/domain/skills/application/skills.errors';
import { AddFileSourceToSkillUseCase } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.command';
import { CreateSkillSourceUploadUseCase } from 'src/domain/skills/application/use-cases/create-skill-source-upload/create-skill-source-upload.use-case';
import { CreateSkillSourceUploadCommand } from 'src/domain/skills/application/use-cases/create-skill-source-upload/create-skill-source-upload.command';
import { CompleteSkillSourceUploadUseCase } from 'src/domain/skills/application/use-cases/complete-skill-source-upload/complete-skill-source-upload.use-case';
import { CompleteSkillSourceUploadCommand } from 'src/domain/skills/application/use-cases/complete-skill-source-upload/complete-skill-source-upload.command';
import { CreateSourceUploadDto } from 'src/domain/sources/presenters/http/dto/create-source-upload.dto';
import { SourceUploadSessionResponseDto } from 'src/domain/sources/presenters/http/dto/source-upload-session-response.dto';
import { toSourceUploadSessionDto } from 'src/domain/sources/presenters/http/mappers/source-upload.mapper';

@ApiTags('skills')
@Controller('skills')
export class SkillSourcesController {
  private readonly logger = new Logger(SkillSourcesController.name);

  constructor(
    private readonly removeSourceFromSkillUseCase: RemoveSourceFromSkillUseCase,
    private readonly listSkillSourcesUseCase: ListSkillSourcesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly addFileSourceToSkillUseCase: AddFileSourceToSkillUseCase,
    private readonly createSourceUploadUseCase: CreateSkillSourceUploadUseCase,
    private readonly completeSourceUploadUseCase: CompleteSkillSourceUploadUseCase,
    private readonly findSkill: FindOneSkillUseCase,
  ) {}

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all sources for the skill',
    type: [SkillSourceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkillSources(
    @Param('id', ParseUUIDPipe) skillId: UUID,
  ): Promise<SkillSourceResponseDto[]> {
    this.logger.log({ skillId }, 'getSkillSources');

    const sources = await this.listSkillSourcesUseCase.execute(
      new ListSkillSourcesQuery(skillId),
    );

    return this.skillDtoMapper.sourcesToDtoArray(sources);
  }

  @Post(':id/sources/file')
  @ApiSkillFileSourceUpload()
  async addFileSource(
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<SkillResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log(
      {
        skillId,
        fileName: file.originalname,
      },
      'addFileSource',
    );
    try {
      await this.addFileSourceToSkillUseCase.execute(
        new AddFileSourceToSkillCommand({ skillId, file }),
      );

      return await this.toSkillDtoWithCreator(skillId);
    } catch (error: unknown) {
      this.logger.error({ err: error as Error }, 'addFileSource');
      throw error;
    } finally {
      removeUploadedFile(file.path);
    }
  }

  private async toSkillDtoWithCreator(
    skillId: UUID,
  ): Promise<SkillResponseDto> {
    const { skill, creatorName, ...context } = await this.findSkill.execute(
      new FindOneSkillQuery(skillId),
    );
    return this.skillDtoMapper.toDto(skill, context, creatorName);
  }

  @Post(':id/uploads')
  @ApiOperation({
    summary: 'Create a direct file upload for a skill',
    description:
      'Checks access, limits and file type, then reserves an upload the browser transfers straight to object storage via the /source-uploads endpoints. Complete it with POST /skills/{id}/uploads/{uploadId}/complete.',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 201, type: SourceUploadSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported file type' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({ status: 413, description: 'File exceeds the upload limit' })
  @ApiResponse({
    status: 409,
    description: 'The target has no source capacity left',
  })
  async createUpload(
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @Body() dto: CreateSourceUploadDto,
  ): Promise<SourceUploadSessionResponseDto> {
    this.logger.log({ skillId, fileName: dto.fileName }, 'createUpload');
    return toSourceUploadSessionDto(
      await this.createSourceUploadUseCase.execute(
        new CreateSkillSourceUploadCommand({ skillId, ...dto }),
      ),
    );
  }

  @Post(':id/uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a direct file upload and attach its sources',
    description:
      'Verifies the stored file, creates the processing source(s), queues them and returns the updated skill. Safe to repeat.',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'uploadId',
    description: 'The upload id',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  @ApiResponse({ status: 404, description: 'Skill or upload not found' })
  @ApiResponse({
    status: 409,
    description:
      'The file was not fully transferred, or the target has no source capacity left',
  })
  @ApiResponse({ status: 410, description: 'The upload expired' })
  @ApiResponse({
    status: 400,
    description: 'The upload was reserved for another target',
  })
  async completeUpload(
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @Param('uploadId', ParseUUIDPipe) uploadId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log({ skillId, uploadId }, 'completeUpload');
    await this.completeSourceUploadUseCase.execute(
      new CompleteSkillSourceUploadCommand(skillId, uploadId),
    );
    return this.toSkillDtoWithCreator(skillId);
  }

  @Delete(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Remove a source from a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'The UUID of the source to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The source has been successfully removed from the skill',
  })
  @ApiResponse({
    status: 404,
    description: 'Skill or source not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log({ skillId, sourceId }, 'removeSource');

    await this.removeSourceFromSkillUseCase.execute(
      new RemoveSourceFromSkillCommand({ skillId, sourceId }),
    );
  }
}
