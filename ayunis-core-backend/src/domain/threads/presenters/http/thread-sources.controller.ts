import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Delete,
  Logger,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Response } from 'express';
import { UUID } from 'crypto';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiConsumes,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { AddSourceToThreadUseCase } from '../../application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { RemoveSourceFromThreadUseCase } from '../../application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from '../../application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { AddSourceCommand } from '../../application/use-cases/add-source-to-thread/add-source.command';
import { RemoveSourceCommand } from '../../application/use-cases/remove-source-from-thread/remove-source.command';
import { FindThreadSourcesQuery } from '../../application/use-cases/get-thread-sources/get-thread-sources.query';
import {
  FileSourceResponseDto,
  UrlSourceResponseDto,
  CSVDataSourceResponseDto,
} from './dto/get-thread-response.dto/source-response.dto';
import { SourceDtoMapper } from './mappers/source.mapper';
import { convertCSVToString } from 'src/common/util/csv';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { Source } from 'src/domain/sources/domain/source.entity';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import {
  buildCsvSourceCommand,
  buildSpreadsheetSourceCommands,
} from 'src/domain/sources/application/util/data-source-parsing';
import {
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
  EmptyFileDataError,
} from 'src/domain/sources/application/sources.errors';

const SUPPORTED_FILE_TYPES = [
  'PDF',
  'DOCX',
  'PPTX',
  'TXT',
  'CSV',
  'XLSX',
  'XLS',
];

@ApiTags('threads')
@Controller('threads')
export class ThreadSourcesController {
  private readonly logger = new Logger(ThreadSourcesController.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly removeSourceFromThreadUseCase: RemoveSourceFromThreadUseCase,
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
  ) {}

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all sources for the thread',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(FileSourceResponseDto) },
          { $ref: getSchemaPath(UrlSourceResponseDto) },
          { $ref: getSchemaPath(CSVDataSourceResponseDto) },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(
    FileSourceResponseDto,
    UrlSourceResponseDto,
    CSVDataSourceResponseDto,
  )
  async getThreadSources(
    @Param('id', ParseUUIDPipe) threadId: UUID,
  ): Promise<
    (FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto)[]
  > {
    this.logger.log('getThreadSources', { threadId });
    const sources = await this.getThreadSourcesUseCase.execute(
      new FindThreadSourcesQuery(threadId),
    );
    return sources.map((source) =>
      this.sourceDtoMapper.toDto(source, threadId),
    );
  }

  @Post(':id/sources/file')
  @ApiOperation({ summary: 'Add a file source to a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
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
        name: {
          type: 'string',
          description: 'The display name for the file source',
        },
        description: {
          type: 'string',
          description: 'A description of the file source',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The file source has been successfully added to the thread',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(FileSourceResponseDto) },
          { $ref: getSchemaPath(UrlSourceResponseDto) },
          { $ref: getSchemaPath(CSVDataSourceResponseDto) },
        ],
      },
    },
  })
  @ApiExtraModels(
    FileSourceResponseDto,
    UrlSourceResponseDto,
    CSVDataSourceResponseDto,
  )
  @UseInterceptors(
    /* eslint-disable sonarjs/content-length -- file size validated downstream */
    FileInterceptor('file', {
      storage: diskStorage({
        // eslint-disable-next-line sonarjs/todo-tag -- pre-existing, tracked separately
        // TODO: Move this to a separate service
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
    /* eslint-enable sonarjs/content-length */
  )
  async addFileSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
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
  ): Promise<
    (FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto)[]
  > {
    if (!file) {
      throw new BadRequestException('No file was provided in the request');
    }

    this.logger.log('addFileSource', { threadId, fileName: file.originalname });
    try {
      const sources = await this.processFileUpload(threadId, file);

      fs.unlinkSync(file.path);
      return sources.map((source) =>
        this.sourceDtoMapper.toDto(source, threadId),
      );
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error });
      try {
        fs.unlinkSync(file.path);
      } catch {
        // Ignore cleanup errors (e.g. ENOENT) to avoid masking the original error
      }
      throw error;
    }
  }

  @Delete(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Remove a source from a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
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
    description: 'The source has been successfully removed from the thread',
  })
  @ApiResponse({ status: 404, description: 'Thread or source not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { threadId, sourceId });

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );
    await this.removeSourceFromThreadUseCase.execute(
      new RemoveSourceCommand(thread, sourceId),
    );
  }

  @Get(':id/sources/:sourceId/download')
  @ApiOperation({ summary: 'Download a data source as CSV' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'The UUID of the source to download',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the source as a CSV file',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread or source not found' })
  @ApiResponse({
    status: 400,
    description: 'Source is not a CSV data source',
  })
  async downloadSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('downloadSource', { threadId, sourceId });

    await this.findThreadUseCase.execute(new FindThreadQuery(threadId));
    const source = await this.getSourceByIdUseCase.execute(
      new GetSourceByIdQuery(sourceId),
    );

    if (!(source instanceof CSVDataSource)) {
      throw new Error('Source is not a CSV data source');
    }

    const csvString = convertCSVToString(source.data);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${source.name}.csv"`,
    });

    return new StreamableFile(Buffer.from(csvString, 'utf-8'));
  }

  @Transactional()
  private async processFileUpload(
    threadId: UUID,
    file: { originalname: string; mimetype: string; path: string },
  ): Promise<Source[]> {
    const detectedType = detectFileType(file.mimetype, file.originalname);
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );

    const created = await this.createSourcesFromFile(file, detectedType);
    for (const source of created) {
      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );
    }
    return created;
  }

  private async createSourcesFromFile(
    file: { originalname: string; mimetype: string; path: string },
    detectedType: ReturnType<typeof detectFileType>,
  ): Promise<Source[]> {
    if (isDocumentFile(detectedType) || isPlainTextFile(detectedType)) {
      const canonicalMimeType = getCanonicalMimeType(detectedType);
      if (!canonicalMimeType) {
        throw new UnsupportedSourceFileTypeError(detectedType);
      }
      const source = await this.startDocumentProcessingUseCase.execute(
        new StartDocumentProcessingCommand({
          fileData: fs.readFileSync(file.path),
          fileName: file.originalname,
          fileType: canonicalMimeType,
        }),
      );
      return [source];
    } else if (isCSVFile(detectedType)) {
      const source = await this.createDataSourceUseCase.execute(
        buildCsvSourceCommand(file),
      );
      return [source];
    } else if (isSpreadsheetFile(detectedType)) {
      const commands = buildSpreadsheetSourceCommands(file);
      if (commands.length === 0) {
        throw new EmptyFileDataError(file.originalname);
      }
      const sources: Source[] = [];
      for (const cmd of commands) {
        sources.push(await this.createDataSourceUseCase.execute(cmd));
      }
      return sources;
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }
}
