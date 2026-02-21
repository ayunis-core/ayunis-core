import {
  Controller,
  Post,
  Logger,
  Get,
  Param,
  ParseUUIDPipe,
  Body,
  Delete,
  Patch,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiConsumes,
  getSchemaPath,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
// Import use cases
import { CreateThreadUseCase } from '../../application/use-cases/create-thread/create-thread.use-case';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindAllThreadsUseCase } from '../../application/use-cases/find-all-threads/find-all-threads.use-case';
import { DeleteThreadUseCase } from '../../application/use-cases/delete-thread/delete-thread.use-case';
import { AddSourceToThreadUseCase } from '../../application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { RemoveSourceFromThreadUseCase } from '../../application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from '../../application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { CreateThreadCommand } from '../../application/use-cases/create-thread/create-thread.command';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { FindAllThreadsQuery } from '../../application/use-cases/find-all-threads/find-all-threads.query';
import { DeleteThreadCommand } from '../../application/use-cases/delete-thread/delete-thread.command';
import { UpdateThreadTitleUseCase } from '../../application/use-cases/update-thread-title/update-thread-title.use-case';
import { UpdateThreadTitleCommand } from '../../application/use-cases/update-thread-title/update-thread-title.command';
import { AddSourceCommand } from '../../application/use-cases/add-source-to-thread/add-source.command';
import { RemoveSourceCommand } from '../../application/use-cases/remove-source-from-thread/remove-source.command';
import { FindThreadSourcesQuery } from '../../application/use-cases/get-thread-sources/get-thread-sources.query';
import { CreateTextSourceUseCase } from '../../../sources/application/use-cases/create-text-source/create-text-source.use-case';
import { AddFileSourceToThreadDto } from './dto/add-source-to-thread.dto';
import {
  FileSourceResponseDto,
  UrlSourceResponseDto,
  CSVDataSourceResponseDto,
} from './dto/get-thread-response.dto/source-response.dto';
import { SourceDtoMapper } from './mappers/source.mapper';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadTitleDto } from './dto/update-thread-title.dto';
import { GetThreadResponseDto } from './dto/get-thread-response.dto';
import { GetThreadsResponseDtoItem } from './dto/get-threads-response-item.dto';
import { GetThreadsResponseDto } from './dto/get-threads-response.dto';
import { FindAllThreadsQueryParamsDto } from './dto/find-all-threads-query-params.dto';
import { GetThreadDtoMapper } from './mappers/get-thread.mapper';
import { GetThreadsDtoMapper } from './mappers/get-threads.mapper';
import { AddKnowledgeBaseToThreadUseCase } from '../../application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.use-case';
import { AddKnowledgeBaseToThreadCommand } from '../../application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.command';
import { RemoveKnowledgeBaseFromThreadUseCase } from '../../application/use-cases/remove-knowledge-base-from-thread/remove-knowledge-base-from-thread.use-case';
import { RemoveKnowledgeBaseFromThreadCommand } from '../../application/use-cases/remove-knowledge-base-from-thread/remove-knowledge-base-from-thread.command';
import * as fs from 'fs';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { convertCSVToString } from 'src/common/util/csv';
import { createSourcesFromFile } from 'src/domain/sources/application/file-source-creator';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import {
  EmptyFileDataError,
  UnsupportedFileTypeError,
} from '../../application/threads.errors';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  private readonly logger = new Logger(ThreadsController.name);

  constructor(
    private readonly createThreadUseCase: CreateThreadUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findAllThreadsUseCase: FindAllThreadsUseCase,
    private readonly deleteThreadUseCase: DeleteThreadUseCase,
    private readonly updateThreadTitleUseCase: UpdateThreadTitleUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly removeSourceFromThreadUseCase: RemoveSourceFromThreadUseCase,
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
    private readonly getThreadDtoMapper: GetThreadDtoMapper,
    private readonly getThreadsDtoMapper: GetThreadsDtoMapper,
    private readonly addKnowledgeBaseToThreadUseCase: AddKnowledgeBaseToThreadUseCase,
    private readonly removeKnowledgeBaseFromThreadUseCase: RemoveKnowledgeBaseFromThreadUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new thread' })
  @ApiBody({ type: CreateThreadDto })
  @ApiResponse({
    status: 201,
    description: 'The thread has been successfully created',
    type: GetThreadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid model data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createThreadDto: CreateThreadDto,
  ): Promise<GetThreadResponseDto> {
    this.logger.log('create', {
      modelId: createThreadDto.modelId,
    });
    const thread = await this.createThreadUseCase.execute(
      new CreateThreadCommand({
        modelId: createThreadDto.modelId,
        agentId: createThreadDto.agentId,
        isAnonymous: createThreadDto.isAnonymous,
      }),
    );
    // New threads are never long chats
    return this.getThreadDtoMapper.toDto({ thread, isLongChat: false });
  }

  @Get()
  @ApiOperation({ summary: 'Get all threads for the current user' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search threads by title',
  })
  @ApiQuery({
    name: 'agentId',
    required: false,
    type: String,
    description: 'Filter threads by agent ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of threads to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of threads to skip (default: 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated threads for the current user',
    type: GetThreadsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(GetThreadsResponseDtoItem)
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Query() queryParams: FindAllThreadsQueryParamsDto,
  ): Promise<GetThreadsResponseDto> {
    this.logger.log('findAll', { filters: queryParams });
    const threads = await this.findAllThreadsUseCase.execute(
      new FindAllThreadsQuery(
        userId,
        undefined,
        {
          search: queryParams.search,
          agentId: queryParams.agentId,
        },
        {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      ),
    );
    return this.getThreadsDtoMapper.toPaginatedDto(threads);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a thread by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread to retrieve',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the thread with the specified ID',
    type: GetThreadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<GetThreadResponseDto> {
    this.logger.log('findOne', { id });
    const result = await this.findThreadUseCase.execute(
      new FindThreadQuery(id),
    );
    return this.getThreadDtoMapper.toDto(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The thread has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    await this.deleteThreadUseCase.execute(new DeleteThreadCommand(id));
  }

  @Patch(':id/title')
  @ApiOperation({ summary: 'Update a thread title' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateThreadTitleDto })
  @ApiResponse({
    status: 204,
    description: 'The thread title has been successfully updated',
  })
  @ApiResponse({ status: 400, description: 'Invalid title data' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTitle(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updateThreadTitleDto: UpdateThreadTitleDto,
  ): Promise<void> {
    this.logger.log('updateTitle', { id, title: updateThreadTitleDto.title });
    await this.updateThreadTitleUseCase.execute(
      new UpdateThreadTitleCommand({
        threadId: id,
        title: updateThreadTitleDto.title,
      }),
    );
  }

  // Source Management Endpoints

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
  })
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
    @Body() addFileSourceDto: AddFileSourceToThreadDto,
    @UploadedFile()
    file: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
      path: string;
    },
  ): Promise<void> {
    this.logger.log('addFileSource', { threadId, fileName: file.originalname });
    try {
      const sources = await createSourcesFromFile(file as Express.Multer.File, {
        createTextSource: (cmd) => this.createTextSourceUseCase.execute(cmd),
        createDataSource: (cmd) => this.createDataSourceUseCase.execute(cmd),
        throwEmptyFileError: (fileName) => {
          throw new EmptyFileDataError(fileName);
        },
        throwUnsupportedTypeError: (type) => {
          throw new UnsupportedFileTypeError(type, [
            'PDF',
            'DOCX',
            'PPTX',
            'CSV',
            'XLSX',
            'XLS',
          ]);
        },
      });

      // Add all sources to the thread
      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      for (const source of sources) {
        await this.addSourceToThreadUseCase.execute(
          new AddSourceCommand(thread, source),
        );
      }

      // Clean up the uploaded file
      fs.unlinkSync(file.path);
      return;
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error });
      // Clean up the uploaded file
      fs.unlinkSync(file.path);
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

    // First get the thread
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );

    // Remove the source from the thread
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

    // First verify the thread exists
    await this.findThreadUseCase.execute(new FindThreadQuery(threadId));

    // Get the source
    const source = await this.getSourceByIdUseCase.execute(
      new GetSourceByIdQuery(sourceId),
    );

    // Check if it's a CSV data source
    if (!(source instanceof CSVDataSource)) {
      throw new Error('Source is not a CSV data source');
    }

    // Convert to CSV string
    const csvString = convertCSVToString(source.data);

    // Set response headers
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${source.name}.csv"`,
    });

    // Return as StreamableFile
    return new StreamableFile(Buffer.from(csvString, 'utf-8'));
  }

  // Knowledge Base Management Endpoints

  @Post(':id/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Add a knowledge base to a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to add',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The knowledge base has been successfully added to the thread',
  })
  @ApiResponse({
    status: 404,
    description: 'Thread or knowledge base not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async addKnowledgeBase(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log('addKnowledgeBase', { threadId, knowledgeBaseId });
    await this.addKnowledgeBaseToThreadUseCase.execute(
      new AddKnowledgeBaseToThreadCommand(threadId, knowledgeBaseId),
    );
  }

  @Delete(':id/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Remove a knowledge base from a thread' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description:
      'The knowledge base has been successfully removed from the thread',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeKnowledgeBase(
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.log('removeKnowledgeBase', { threadId, knowledgeBaseId });
    await this.removeKnowledgeBaseFromThreadUseCase.execute(
      new RemoveKnowledgeBaseFromThreadCommand(threadId, knowledgeBaseId),
    );
  }
}
