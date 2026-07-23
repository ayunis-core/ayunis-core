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
import * as fs from 'fs';
import {
  SOURCE_FILE_API_BODY,
  SOURCE_FILE_UPLOAD_OPTIONS,
  UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { AddFileSourceToThreadUseCase } from '../../application/use-cases/add-file-source-to-thread/add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from '../../application/use-cases/add-file-source-to-thread/add-file-source-to-thread.command';
import { RemoveSourceFromThreadUseCase } from '../../application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from '../../application/use-cases/get-thread-sources/get-thread-sources.use-case';
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
import { InvalidSourceTypeError } from 'src/domain/sources/application/sources.errors';
import { SourceNotFoundError as SourceNotFoundInThreadError } from '../../application/threads.errors';

const THREAD_ID_API_PARAM = {
  name: 'id',
  description: 'The UUID of the thread',
  type: 'string',
  format: 'uuid',
};

const FILE_SOURCE_CREATED_RESPONSE = {
  status: 201,
  description: 'The file source has been successfully added to the thread',
  schema: {
    type: 'array' as const,
    items: {
      oneOf: [
        { $ref: getSchemaPath(FileSourceResponseDto) },
        { $ref: getSchemaPath(UrlSourceResponseDto) },
        { $ref: getSchemaPath(CSVDataSourceResponseDto) },
      ],
    },
  },
};

const CSV_DOWNLOAD_RESPONSE = {
  status: 200,
  description: 'Returns the source as a CSV file',
  content: {
    'text/csv': {
      schema: { type: 'string' as const, format: 'binary' },
    },
  },
};

@ApiTags('threads')
@Controller('threads')
export class ThreadSourcesController {
  private readonly logger = new Logger(ThreadSourcesController.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addFileSourceToThreadUseCase: AddFileSourceToThreadUseCase,
    private readonly removeSourceFromThreadUseCase: RemoveSourceFromThreadUseCase,
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
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
  @ApiParam(THREAD_ID_API_PARAM)
  @ApiConsumes('multipart/form-data')
  @ApiBody(SOURCE_FILE_API_BODY)
  @ApiResponse(FILE_SOURCE_CREATED_RESPONSE)
  @ApiResponse({
    status: 413,
    description: 'File exceeds the 25 MB upload limit',
  })
  @ApiExtraModels(
    FileSourceResponseDto,
    UrlSourceResponseDto,
    CSVDataSourceResponseDto,
  )
  @UseInterceptors(FileInterceptor('file', SOURCE_FILE_UPLOAD_OPTIONS))
  async addFileSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<
    (FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto)[]
  > {
    if (!file) {
      throw new BadRequestException('No file was provided in the request');
    }

    this.logger.log('addFileSource', { threadId, fileName: file.originalname });
    try {
      const sources = await this.addFileSourceToThreadUseCase.execute(
        new AddFileSourceToThreadCommand(threadId, file),
      );

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
  @ApiParam(THREAD_ID_API_PARAM)
  @ApiParam({
    name: 'sourceId',
    description: 'The UUID of the source to download',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse(CSV_DOWNLOAD_RESPONSE)
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
}
