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
  UploadedFile,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

import { AddSourceToSkillUseCase } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { AddFileSourceToSkillUseCase } from '../../application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from '../../application/use-cases/add-file-source-to-skill/add-file-source-to-skill.command';
import { RemoveSourceFromSkillUseCase } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from '../../application/use-cases/list-skill-sources/list-skill-sources.use-case';

import { AddSourceToSkillCommand } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.command';
import { RemoveSourceFromSkillCommand } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from '../../application/use-cases/list-skill-sources/list-skill-sources.query';

import { SkillAccessService } from '../../application/services/skill-access.service';
import { SkillCreatorNameService } from '../../application/services/skill-creator-name.service';

import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

import * as fs from 'fs';
import { Transactional } from '@nestjs-cls/transactional';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { ApiSkillFileSourceUpload } from './decorators/skill-sources.decorators';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Skill } from '../../domain/skill.entity';
import {
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
  MissingFileError,
} from '../../application/skills.errors';
import {
  buildCsvSourceCommand,
  buildSpreadsheetSourceCommands,
} from 'src/domain/sources/application/util/data-source-parsing';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@Controller('skills')
export class SkillSourcesController {
  private readonly logger = new Logger(SkillSourcesController.name);

  constructor(
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly addFileSourceToSkillUseCase: AddFileSourceToSkillUseCase,
    private readonly removeSourceFromSkillUseCase: RemoveSourceFromSkillUseCase,
    private readonly listSkillSourcesUseCase: ListSkillSourcesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
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
  @ApiSkillFileSourceUpload()
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @UploadedFile()
    file:
      | {
          fieldname: string;
          originalname: string;
          encoding: string;
          mimetype: string;
          size: number;
          buffer: Buffer;
          path: string;
        }
      | undefined,
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
      const updatedSkill = await this.processFileUpload(skillId, file);

      fs.unlinkSync(file.path);
      const context = await this.skillAccessService.resolveUserContext(skillId);
      const creatorName = context.isShared
        ? await this.skillCreatorNameService.resolveOne(updatedSkill.userId)
        : null;
      return this.skillDtoMapper.toDto(updatedSkill, context, creatorName);
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error: error as Error });
      fs.unlinkSync(file.path);
      throw error;
    }
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

  private async processFileUpload(
    skillId: UUID,
    file: { originalname: string; mimetype: string; path: string },
  ): Promise<Skill> {
    const detectedType = detectFileType(file.mimetype, file.originalname);

    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      const fileData = fs.readFileSync(file.path);
      const canonicalMimeType = getCanonicalMimeType(detectedType);
      if (!canonicalMimeType) {
        throw new Error(
          `Unable to determine MIME type for detected file type: ${detectedType}`,
        );
      }
      return this.addFileSourceToSkillUseCase.execute(
        new AddFileSourceToSkillCommand({
          skillId,
          fileData,
          fileName: file.originalname,
          fileType: canonicalMimeType,
        }),
      );
    } else if (isCSVFile(detectedType)) {
      return this.processCSVUpload(skillId, file);
    } else if (isSpreadsheetFile(detectedType)) {
      return this.processSpreadsheetUpload(skillId, file);
    } else {
      throw new UnsupportedFileTypeError(
        detectedType === 'unknown' ? file.originalname : detectedType,
        [
          'PDF',
          'DOCX',
          'PPTX',
          'TXT',
          'CSV',
          'XLSX',
          'XLS',
          'MP3',
          'M4A',
          'WAV',
          'WEBM',
        ],
      );
    }
  }

  @Transactional()
  private async processCSVUpload(
    skillId: UUID,
    file: { originalname: string; path: string },
  ): Promise<Skill> {
    const source = await this.createCsvSource(file);
    return this.addSourceToSkillUseCase.execute(
      new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
    );
  }

  @Transactional()
  private async processSpreadsheetUpload(
    skillId: UUID,
    file: { originalname: string; path: string },
  ): Promise<Skill> {
    const sources = await this.createSpreadsheetSources(file);
    let updatedSkill: Skill | undefined;
    for (const source of sources) {
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
      );
    }
    return updatedSkill!;
  }

  private async createCsvSource(file: {
    originalname: string;
    path: string;
  }): Promise<Source> {
    const command = buildCsvSourceCommand(file);
    return this.createDataSourceUseCase.execute(command);
  }

  private async createSpreadsheetSources(file: {
    originalname: string;
    path: string;
  }): Promise<Source[]> {
    const commands = buildSpreadsheetSourceCommands(file);

    if (commands.length === 0) {
      throw new EmptyFileDataError(file.originalname);
    }

    const sources: Source[] = [];
    for (const command of commands) {
      const source = await this.createDataSourceUseCase.execute(command);
      sources.push(source);
    }
    return sources;
  }
}
