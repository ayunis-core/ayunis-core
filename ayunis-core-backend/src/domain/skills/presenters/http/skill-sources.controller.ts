import {
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
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

import { RemoveSourceFromSkillUseCase } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.use-case';

import { RemoveSourceFromSkillCommand } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.query';

import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';

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
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { MissingFileError } from 'src/domain/skills/application/skills.errors';
import { AddFileSourceToSkillUseCase } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.command';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

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
    this.logger.log({ skillId, userId }, 'getSkillSources');

    const sources = await this.listSkillSourcesUseCase.execute(
      new ListSkillSourcesQuery(skillId),
    );

    return this.skillDtoMapper.sourcesToDtoArray(sources);
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Post(':id/sources/file')
  @ApiSkillFileSourceUpload()
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<SkillResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log(
      {
        skillId,
        userId,
        fileName: file.originalname,
      },
      'addFileSource',
    );
    try {
      const updatedSkill = await this.addFileSourceToSkillUseCase.execute(
        new AddFileSourceToSkillCommand({ skillId, file }),
      );

      return await this.toSkillDtoWithCreator(updatedSkill, skillId);
    } catch (error: unknown) {
      this.logger.error({ err: error as Error }, 'addFileSource');
      throw error;
    } finally {
      removeUploadedFile(file.path);
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

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    this.logger.log({ skillId, sourceId, userId }, 'removeSource');

    await this.removeSourceFromSkillUseCase.execute(
      new RemoveSourceFromSkillCommand({ skillId, sourceId }),
    );
  }
}
