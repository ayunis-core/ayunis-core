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

import { AddSourceToSkillUseCase } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { RemoveSourceFromSkillUseCase } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from '../../application/use-cases/list-skill-sources/list-skill-sources.use-case';

import { AddSourceToSkillCommand } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.command';
import { RemoveSourceFromSkillCommand } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from '../../application/use-cases/list-skill-sources/list-skill-sources.query';

import { SkillAccessService } from '../../application/services/skill-access.service';

import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Transactional } from '@nestjs-cls/transactional';
import { CreateFileSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Skill } from '../../domain/skill.entity';
import {
  DetectedFileType,
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
  MissingFileError,
} from '../../application/skills.errors';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';

@ApiTags('skills')
@Controller('skills')
export class SkillSourcesController {
  private readonly logger = new Logger(SkillSourcesController.name);

  constructor(
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly removeSourceFromSkillUseCase: RemoveSourceFromSkillUseCase,
    private readonly listSkillSourcesUseCase: ListSkillSourcesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly skillAccessService: SkillAccessService,
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
      required: ['file'],
    },
  })
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
  @UseInterceptors(
    FileInterceptor('file', {
      // eslint-disable-next-line sonarjs/content-length -- false positive: diskStorage config, not a Content-Length header
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @Transactional()
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
      return this.skillDtoMapper.toDto(updatedSkill, context);
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
    const sources: Source[] = [];
    const detectedType = detectFileType(file.mimetype, file.originalname);

    if (isDocumentFile(detectedType)) {
      const source = await this.createDocumentSource(file, detectedType);
      sources.push(source);
    } else if (isCSVFile(detectedType)) {
      const source = await this.createCsvSource(file);
      sources.push(source);
    } else if (isSpreadsheetFile(detectedType)) {
      const sheetSources = await this.createSpreadsheetSources(file);
      sources.push(...sheetSources);
    } else {
      throw new UnsupportedFileTypeError(
        detectedType === 'unknown' ? file.originalname : detectedType,
        ['PDF', 'DOCX', 'PPTX', 'CSV', 'XLSX', 'XLS'],
      );
    }

    let updatedSkill: Skill | undefined;
    for (const source of sources) {
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
      );
    }

    return updatedSkill!;
  }

  private async createDocumentSource(
    file: { originalname: string; path: string },
    detectedType: DetectedFileType,
  ): Promise<Source> {
    const fileData = fs.readFileSync(file.path);
    const canonicalMimeType = getCanonicalMimeType(detectedType)!;

    return this.createTextSourceUseCase.execute(
      new CreateFileSourceCommand({
        fileType: canonicalMimeType,
        fileData: fileData,
        fileName: file.originalname,
      }),
    );
  }

  private async createCsvSource(file: {
    originalname: string;
    path: string;
  }): Promise<Source> {
    const fileData = fs.readFileSync(file.path, 'utf8');
    const { headers, data } = parseCSV(fileData);
    return this.createDataSourceUseCase.execute(
      new CreateCSVDataSourceCommand({
        name: file.originalname,
        data: { headers, rows: data },
      }),
    );
  }

  private async createSpreadsheetSources(file: {
    originalname: string;
    path: string;
  }): Promise<Source[]> {
    const fileData = fs.readFileSync(file.path);
    const sheets = parseExcel(fileData);

    if (sheets.length === 0) {
      throw new EmptyFileDataError(file.originalname);
    }

    const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');
    const sources: Source[] = [];

    for (const sheet of sheets) {
      const sourceName =
        sheets.length === 1
          ? `${baseFileName}.csv`
          : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

      const source = await this.createDataSourceUseCase.execute(
        new CreateCSVDataSourceCommand({
          name: sourceName,
          data: { headers: sheet.headers, rows: sheet.rows },
        }),
      );
      sources.push(source);
    }

    return sources;
  }
}
