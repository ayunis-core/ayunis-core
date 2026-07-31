import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Delete,
  Logger,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Response } from 'express';
import { UUID } from 'crypto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import {
  ApiFileSourceUpload,
  ApiSourceCsvDownload,
  ApiSourceIdParam,
  ApiSourceListResponse,
  ApiThreadIdParam,
} from './decorators/thread-sources.decorators';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { AddSourceToThreadUseCase } from '../../application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddFileSourceToThreadUseCase } from '../../application/use-cases/add-file-source-to-thread/add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from '../../application/use-cases/add-file-source-to-thread/add-file-source-to-thread.command';
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
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { Source } from 'src/domain/sources/domain/source.entity';
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
  buildCsvSourceCommand,
  buildSpreadsheetSourceCommands,
} from 'src/domain/sources/application/util/data-source-parsing';
import {
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
  InvalidSourceTypeError,
  EmptyFileDataError,
} from 'src/domain/sources/application/sources.errors';
import { SourceNotFoundError as SourceNotFoundInThreadError } from '../../application/threads.errors';
import { Thread } from '../../domain/thread.entity';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

const SUPPORTED_FILE_TYPES = [
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
];

@ApiTags('threads')
@RequireAcademyCertificate()
@Controller('threads')
export class ThreadSourcesController {
  private readonly logger = new Logger(ThreadSourcesController.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly addFileSourceToThreadUseCase: AddFileSourceToThreadUseCase,
    private readonly removeSourceFromThreadUseCase: RemoveSourceFromThreadUseCase,
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
  ) {}

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a thread' })
  @ApiThreadIdParam()
  @ApiSourceListResponse(200, 'Returns all sources for the thread')
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiFileSourceUpload()
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
  @ApiThreadIdParam()
  @ApiSourceIdParam('The UUID of the source to remove')
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
  @ApiSourceCsvDownload()
  async downloadSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('downloadSource', { threadId, sourceId });

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );

    const isAssigned = thread.sourceAssignments?.some(
      (a) => a.source.id === sourceId,
    );
    if (!isAssigned) {
      throw new SourceNotFoundInThreadError(sourceId, { threadId });
    }

    const source = await this.getSourceByIdUseCase.execute(
      new GetSourceByIdQuery(sourceId),
    );

    if (!(source instanceof CSVDataSource)) {
      throw new InvalidSourceTypeError(source.constructor.name);
    }

    const csvString = convertCSVToString(source.data);
    const encodedName = encodeURIComponent(`${source.name}.csv`);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
    });

    return new StreamableFile(Buffer.from(csvString, 'utf-8'));
  }

  private async processFileUpload(
    threadId: UUID,
    file: { originalname: string; mimetype: string; path: string },
  ): Promise<Source[]> {
    const detectedType = detectFileType(file.mimetype, file.originalname);
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );

    const created = await this.createSourcesFromFile(
      thread,
      file,
      detectedType,
    );
    return created;
  }

  private async createSourcesFromFile(
    thread: Thread,
    file: { originalname: string; mimetype: string; path: string },
    detectedType: ReturnType<typeof detectFileType>,
  ): Promise<Source[]> {
    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      return this.processDocumentUpload(thread, file, detectedType);
    } else if (isCSVFile(detectedType)) {
      return this.processCSVUpload(thread, file);
    } else if (isSpreadsheetFile(detectedType)) {
      return this.processSpreadsheetUpload(thread, file);
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }

  private async processDocumentUpload(
    thread: Thread,
    file: { originalname: string; path: string },
    detectedType: ReturnType<typeof detectFileType>,
  ): Promise<Source[]> {
    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      throw new UnsupportedSourceFileTypeError(detectedType);
    }
    const source = await this.addFileSourceToThreadUseCase.execute(
      new AddFileSourceToThreadCommand({
        thread,
        fileData: fs.readFileSync(file.path),
        fileName: file.originalname,
        fileType: canonicalMimeType,
      }),
    );
    return [source];
  }

  @Transactional()
  private async processCSVUpload(
    thread: Thread,
    file: { originalname: string; path: string },
  ): Promise<Source[]> {
    const source = await this.createDataSourceUseCase.execute(
      buildCsvSourceCommand(file),
    );
    await this.addSourceToThreadUseCase.execute(
      new AddSourceCommand(thread, source),
    );
    return [source];
  }

  @Transactional()
  private async processSpreadsheetUpload(
    thread: Thread,
    file: { originalname: string; path: string },
  ): Promise<Source[]> {
    const commands = buildSpreadsheetSourceCommands(file);
    if (commands.length === 0) {
      throw new EmptyFileDataError(file.originalname);
    }
    const sources: Source[] = [];
    for (const cmd of commands) {
      const source = await this.createDataSourceUseCase.execute(cmd);
      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );
      sources.push(source);
    }
    return sources;
  }
}
