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
import { Response } from 'express';
import { UUID } from 'crypto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  removeUploadedFile,
  UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import {
  ApiFileSourceUpload,
  ApiSourceCsvDownload,
  ApiSourceIdParam,
  ApiSourceListResponse,
  ApiThreadIdParam,
} from './decorators/thread-sources.decorators';
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
import {
  InvalidSourceTypeError,
  SourceNotReadyError,
} from 'src/domain/sources/application/sources.errors';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TusUploadService } from 'src/domain/uploads/application/services/tus-upload.service';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SourceNotFoundError as SourceNotFoundInThreadError } from '../../application/threads.errors';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

type ThreadSourceDto =
  FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto;

@ApiTags('threads')
@RequireAcademyCertificate()
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
    private readonly tusUploadService: TusUploadService,
  ) {}

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a thread' })
  @ApiThreadIdParam()
  @ApiSourceListResponse(200, 'Returns all sources for the thread')
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getThreadSources(
    @Param('id', ParseUUIDPipe) threadId: UUID,
  ): Promise<ThreadSourceDto[]> {
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
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<ThreadSourceDto[]> {
    if (!file) {
      throw new BadRequestException('No file was provided in the request');
    }

    this.logger.log('addFileSource', { threadId, fileName: file.originalname });
    try {
      const sources = await this.addFileSourceToThreadUseCase.execute(
        new AddFileSourceToThreadCommand({ threadId, file }),
      );

      return sources.map((source) =>
        this.sourceDtoMapper.toDto(source, threadId),
      );
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error });
      throw error;
    } finally {
      removeUploadedFile(file.path);
    }
  }

  @Post(':id/sources/uploads/:uploadId')
  @ApiOperation({
    summary: 'Attach a completed resumable (tus) upload as a file source',
  })
  @ApiThreadIdParam()
  @ApiParam({ name: 'uploadId', description: 'The tus upload id' })
  @ApiSourceListResponse(
    201,
    'The file source has been successfully added to the thread',
  )
  @ApiResponse({ status: 404, description: 'Thread or upload not found' })
  @ApiResponse({ status: 409, description: 'Upload not finished yet' })
  async finalizeUpload(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('uploadId') uploadId: string,
  ): Promise<ThreadSourceDto[]> {
    this.logger.log('finalizeUpload', { threadId, uploadId });
    const file = await this.tusUploadService.resolveCompletedUpload(
      uploadId,
      userId,
    );
    try {
      const sources = await this.addFileSourceToThreadUseCase.execute(
        new AddFileSourceToThreadCommand({ threadId, file }),
      );
      return sources.map((source) =>
        this.sourceDtoMapper.toDto(source, threadId),
      );
    } finally {
      this.tusUploadService.cleanupUpload(uploadId);
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

    const source = await this.loadReadyCsvSource(sourceId);

    const csvString = convertCSVToString(source.data);
    const encodedName = encodeURIComponent(`${source.name}.csv`);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
    });

    return new StreamableFile(Buffer.from(csvString, 'utf-8'));
  }

  private async loadReadyCsvSource(sourceId: UUID): Promise<CSVDataSource> {
    const source = await this.getSourceByIdUseCase.execute(
      new GetSourceByIdQuery(sourceId),
    );

    if (!(source instanceof CSVDataSource)) {
      throw new InvalidSourceTypeError(source.constructor.name);
    }
    if (source.status !== SourceStatus.READY) {
      throw new SourceNotReadyError(sourceId);
    }
    return source;
  }
}
