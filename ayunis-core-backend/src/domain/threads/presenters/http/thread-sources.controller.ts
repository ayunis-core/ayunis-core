import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  removeUploadedFile,
  UploadedSourceFile,
} from 'src/common/util/source-file-upload';
import {
  ApiFileSourceUpload,
  ApiSourceIdParam,
  ApiSourceListResponse,
  ApiThreadIdParam,
} from './decorators/thread-sources.decorators';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AddFileSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-file-source-to-thread/add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from 'src/domain/threads/application/use-cases/add-file-source-to-thread/add-file-source-to-thread.command';
import { RemoveSourceFromThreadUseCase } from 'src/domain/threads/application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { RemoveSourceCommand } from 'src/domain/threads/application/use-cases/remove-source-from-thread/remove-source.command';
import { FindThreadSourcesQuery } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.query';
import {
  FileSourceResponseDto,
  UrlSourceResponseDto,
  CSVDataSourceResponseDto,
} from './dto/get-thread-response.dto/source-response.dto';
import { SourceDtoMapper } from './mappers/source.mapper';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { CreateThreadSourceUploadUseCase } from 'src/domain/threads/application/use-cases/create-thread-source-upload/create-thread-source-upload.use-case';
import { CreateThreadSourceUploadCommand } from 'src/domain/threads/application/use-cases/create-thread-source-upload/create-thread-source-upload.command';
import { CompleteThreadSourceUploadUseCase } from 'src/domain/threads/application/use-cases/complete-thread-source-upload/complete-thread-source-upload.use-case';
import { CompleteThreadSourceUploadCommand } from 'src/domain/threads/application/use-cases/complete-thread-source-upload/complete-thread-source-upload.command';
import { CreateSourceUploadDto } from 'src/domain/sources/presenters/http/dto/create-source-upload.dto';
import { SourceUploadSessionResponseDto } from 'src/domain/sources/presenters/http/dto/source-upload-session-response.dto';
import { toSourceUploadSessionDto } from 'src/domain/sources/presenters/http/mappers/source-upload.mapper';
import { AllowedClients } from 'src/iam/authorization/application/decorators/allowed-clients.decorator';

type ThreadSourceResponseDto =
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
    private readonly createSourceUploadUseCase: CreateThreadSourceUploadUseCase,
    private readonly completeSourceUploadUseCase: CompleteThreadSourceUploadUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
  ) {}

  @AllowedClients('outlook')
  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a thread' })
  @ApiThreadIdParam()
  @ApiSourceListResponse(200, 'Returns all sources for the thread')
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getThreadSources(
    @Param('id', ParseUUIDPipe) threadId: UUID,
  ): Promise<ThreadSourceResponseDto[]> {
    this.logger.log({ threadId }, 'getThreadSources');
    const sources = await this.getThreadSourcesUseCase.execute(
      new FindThreadSourcesQuery(threadId),
    );
    return sources.map((source) =>
      this.sourceDtoMapper.toDto(source, threadId),
    );
  }

  @AllowedClients('outlook')
  @Post(':id/sources/file')
  @ApiFileSourceUpload()
  async addFileSource(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @UploadedFile() file: UploadedSourceFile | undefined,
  ): Promise<ThreadSourceResponseDto[]> {
    if (!file) {
      throw new BadRequestException('No file was provided in the request');
    }

    this.logger.log({ threadId, fileName: file.originalname }, 'addFileSource');
    try {
      const sources = await this.addFileSourceToThreadUseCase.execute(
        new AddFileSourceToThreadCommand({ threadId, file }),
      );

      return sources.map((source) =>
        this.sourceDtoMapper.toDto(source, threadId),
      );
    } catch (error: unknown) {
      this.logger.error({ err: error as Error }, 'addFileSource');
      throw error;
    } finally {
      removeUploadedFile(file.path);
    }
  }

  @Post(':id/uploads')
  @ApiOperation({
    summary: 'Create a direct file upload for a thread',
    description:
      'Checks access, limits and file type, then reserves an upload the browser transfers straight to object storage via the /source-uploads endpoints. Complete it with POST /threads/{id}/uploads/{uploadId}/complete.',
  })
  @ApiThreadIdParam()
  @ApiResponse({ status: 201, type: SourceUploadSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported file type' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 413, description: 'File exceeds the upload limit' })
  @ApiResponse({
    status: 409,
    description: 'The target has no source capacity left',
  })
  async createUpload(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Body() dto: CreateSourceUploadDto,
  ): Promise<SourceUploadSessionResponseDto> {
    this.logger.log({ threadId, fileName: dto.fileName }, 'createUpload');
    return toSourceUploadSessionDto(
      await this.createSourceUploadUseCase.execute(
        new CreateThreadSourceUploadCommand({ threadId, ...dto }),
      ),
    );
  }

  @Post(':id/uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a direct file upload and attach its sources',
    description:
      'Verifies the stored file, creates the processing source(s) and queues them. Safe to repeat: a second call returns the same sources.',
  })
  @ApiThreadIdParam()
  @ApiParam({
    name: 'uploadId',
    description: 'The upload id',
    type: 'string',
    format: 'uuid',
  })
  @ApiSourceListResponse(200, 'The sources created from the upload')
  @ApiResponse({ status: 404, description: 'Thread or upload not found' })
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
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('uploadId', ParseUUIDPipe) uploadId: UUID,
  ): Promise<ThreadSourceResponseDto[]> {
    this.logger.log({ threadId, uploadId }, 'completeUpload');
    const sources = await this.completeSourceUploadUseCase.execute(
      new CompleteThreadSourceUploadCommand(threadId, uploadId),
    );
    return sources.map((source) =>
      this.sourceDtoMapper.toDto(source, threadId),
    );
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
    this.logger.log({ threadId, sourceId }, 'removeSource');

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );
    await this.removeSourceFromThreadUseCase.execute(
      new RemoveSourceCommand(thread, sourceId),
    );
  }
}
