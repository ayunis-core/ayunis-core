import {
  BadRequestException,
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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    this.logger.log({ threadId }, 'getThreadSources');
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
  ): Promise<
    (FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto)[]
  > {
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
