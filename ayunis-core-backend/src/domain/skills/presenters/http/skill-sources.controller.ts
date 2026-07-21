import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

import { RemoveSourceFromSkillUseCase } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from '../../application/use-cases/list-skill-sources/list-skill-sources.use-case';

import { RemoveSourceFromSkillCommand } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from '../../application/use-cases/list-skill-sources/list-skill-sources.query';

import { SkillAccessService } from '../../application/services/skill-access.service';
import { SkillCreatorNameService } from '../../application/services/skill-creator-name.service';

import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import {
  SOURCE_FILE_API_BODY,
  SOURCE_FILE_UPLOAD_OPTIONS,
  UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import { Skill } from '../../domain/skill.entity';
import { MissingFileError } from '../../application/skills.errors';
import { AddFileSourceToSkillUseCase } from '../../application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from '../../application/use-cases/add-file-source-to-skill/add-file-source-to-skill.command';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@Controller('skills')
export class SkillSourcesController {
  private readonly logger = new Logger(SkillSourcesController.name);

  constructor(
    private readonly removeSourceFromSkillUseCase: RemoveSourceFromSkillUseCase,
    private readonly listSkillSourcesUseCase: ListSkillSourcesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly addFileSourceToSkillUseCase: AddFileSourceToSkillUseCase,
    private readonly skillAccessService: SkillAccessService,
    private readonly skillCreatorNameService: SkillCreatorNameService,
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
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
  ): Promise<SkillSourceResponseDto[]> {
    this.logger.log('getSkillSources', { skillId, userId });

    const sources = await this.listSkillSourcesUseCase.execute(
      new ListSkillSourcesQuery(skillId),
    );

    return this.skillDtoMapper.sourcesToDtoArray(sources);
  }

  @Post(':id/sources/file')
  @ApiOperation({ summary: 'Add a file source to a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(SOURCE_FILE_API_BODY)
  @ApiResponse({
    status: 201,
    description: 'The file source has been successfully added to the skill',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or unsupported file type',
  })
  @ApiResponse({
    status: 413,
    description: 'File exceeds the 25 MB upload limit',
  })
  @UseInterceptors(FileInterceptor('file', SOURCE_FILE_UPLOAD_OPTIONS))
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<SkillResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log('addFileSource', {
      skillId,
      userId,
      fileName: file.originalname,
    });
    try {
      const updatedSkill = await this.addFileSourceToSkillUseCase.execute(
        new AddFileSourceToSkillCommand(skillId, file),
      );

      fs.unlinkSync(file.path);
      return await this.toSkillDtoWithCreator(updatedSkill, skillId);
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error: error as Error });
      fs.unlinkSync(file.path);
      throw error;
    }
  }

  private async toSkillDtoWithCreator(
    skill: Skill,
    skillId: UUID,
  ): Promise<SkillResponseDto> {
    const context = await this.skillAccessService.resolveUserContext(skillId);
    const creatorName = context.isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;
    return this.skillDtoMapper.toDto(skill, context, creatorName);
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
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { skillId, sourceId, userId });

    await this.removeSourceFromSkillUseCase.execute(
      new RemoveSourceFromSkillCommand({ skillId, sourceId }),
    );
  }
}
