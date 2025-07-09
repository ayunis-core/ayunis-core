import {
  Controller,
  Post,
  Logger,
  Get,
  Param,
  ParseUUIDPipe,
  Body,
  Delete,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
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
import { UpdateThreadModelUseCase } from '../../application/use-cases/update-thread-model/update-thread-model.use-case';

// Import commands and queries
import { CreateThreadCommand } from '../../application/use-cases/create-thread/create-thread.command';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { FindAllThreadsQuery } from '../../application/use-cases/find-all-threads/find-all-threads.query';
import { DeleteThreadCommand } from '../../application/use-cases/delete-thread/delete-thread.command';
import { AddSourceCommand } from '../../application/use-cases/add-source-to-thread/add-source.command';
import { RemoveSourceCommand } from '../../application/use-cases/remove-source-from-thread/remove-source.command';
import { FindThreadSourcesQuery } from '../../application/use-cases/get-thread-sources/get-thread-sources.query';
import { UpdateThreadModelCommand } from '../../application/use-cases/update-thread-model/update-thread-model.command';

// Import other dependencies
import { CreateFileSourceCommand } from '../../../sources/application/use-cases/create-file-source/create-file-source.command';
import { AddFileSourceToThreadDto } from './dto/add-source-to-thread.dto';
import {
  SourceResponseDto,
  FileSourceResponseDto,
} from './dto/source-response.dto';
import { SourceDtoMapper } from './mappers/source.mapper';
import { UpdateThreadModelDto } from './dto/update-thread-model.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { GetThreadResponseDto } from './dto/get-thread-response.dto';
import { GetThreadsResponseDtoItem } from './dto/get-threads-response-item.dto';
import { GetThreadDtoMapper } from './mappers/get-thread.mapper';
import { CreateFileSourceUseCase } from '../../../sources/application/use-cases/create-file-source/create-file-source.use-case';
import { DeleteSourceUseCase } from '../../../sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from '../../../sources/application/use-cases/delete-source/delete-source.command';
import { GetThreadsDtoMapper } from './mappers/get-threads.mapper';
import { UpdateThreadAgentCommand } from '../../application/use-cases/update-thread-agent/update-thread-agent.command';
import { UpdateThreadAgentUseCase } from '../../application/use-cases/update-thread-agent/update-thread-agent.use-case';
import { UpdateThreadAgentDto } from './dto/update-thread-agent.dto';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  private readonly logger = new Logger(ThreadsController.name);

  constructor(
    private readonly createThreadUseCase: CreateThreadUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findAllThreadsUseCase: FindAllThreadsUseCase,
    private readonly deleteThreadUseCase: DeleteThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly removeSourceFromThreadUseCase: RemoveSourceFromThreadUseCase,
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
    private readonly updateThreadModelUseCase: UpdateThreadModelUseCase,
    private readonly createFileSourceUseCase: CreateFileSourceUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
    private readonly getThreadDtoMapper: GetThreadDtoMapper,
    private readonly getThreadsDtoMapper: GetThreadsDtoMapper,
    private readonly updateThreadAgentUseCase: UpdateThreadAgentUseCase,
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
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() createThreadDto: CreateThreadDto,
  ): Promise<GetThreadResponseDto> {
    this.logger.log('create', {
      userId,
      modelId: createThreadDto.modelId,
    });
    const thread = await this.createThreadUseCase.execute(
      new CreateThreadCommand({
        userId,
        orgId,
        modelId: createThreadDto.modelId,
        agentId: createThreadDto.agentId,
      }),
    );
    return this.getThreadDtoMapper.toDto(thread);
  }

  @Get()
  @ApiOperation({ summary: 'Get all threads for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all threads for the current user',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(GetThreadsResponseDtoItem),
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(GetThreadsResponseDtoItem)
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<GetThreadsResponseDtoItem[]> {
    this.logger.log('findAll');
    const threads = await this.findAllThreadsUseCase.execute(
      new FindAllThreadsQuery(userId),
    );
    return this.getThreadsDtoMapper.toDtoArray(threads);
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
  @ApiExtraModels(GetThreadsResponseDtoItem)
  async findOne(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<GetThreadResponseDto> {
    this.logger.log('findOne', { id });
    const thread = await this.findThreadUseCase.execute(
      new FindThreadQuery(id, userId),
    );
    return this.getThreadDtoMapper.toDto(thread);
  }

  @Patch(':id/model')
  @ApiOperation({ summary: 'Update thread model' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateThreadModelDto })
  @ApiResponse({
    status: 200,
    description: 'The thread model has been successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 400, description: 'Invalid model data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Body() updateModelDto: UpdateThreadModelDto,
  ): Promise<void> {
    this.logger.log('updateModel', {
      threadId,
      modelId: updateModelDto.modelId,
    });

    const command = new UpdateThreadModelCommand(
      threadId,
      userId,
      updateModelDto.modelId,
    );

    await this.updateThreadModelUseCase.execute(command);
  }

  @Patch(':id/agent')
  @ApiOperation({ summary: 'Update thread agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the thread to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateThreadAgentDto })
  @ApiResponse({
    status: 200,
    description: 'The thread agent has been successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 400, description: 'Invalid agent data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateAgent(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Body() updateAgentDto: UpdateThreadAgentDto,
  ): Promise<void> {
    this.logger.log('updateAgent', {
      threadId,
      agentId: updateAgentDto.agentId,
    });

    const command = new UpdateThreadAgentCommand({
      threadId,
      agentId: updateAgentDto.agentId,
      userId,
    });

    await this.updateThreadAgentUseCase.execute(command);
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
  async delete(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log('delete', { id });
    await this.deleteThreadUseCase.execute(new DeleteThreadCommand(id, userId));
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
    type: [SourceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getThreadSources(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) threadId: UUID,
  ): Promise<SourceResponseDto[]> {
    this.logger.log('getThreadSources', { threadId });
    const sources = await this.getThreadSourcesUseCase.execute(
      new FindThreadSourcesQuery(threadId, userId),
    );
    return sources.map((source) => this.sourceDtoMapper.toDto(source));
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
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'The ID of the user who owns this source',
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
      required: ['file', 'userId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The file source has been successfully added to the thread',
    type: FileSourceResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // TODO: Move this to a separate service
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
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
  ): Promise<FileSourceResponseDto> {
    this.logger.log('addFileSource', { threadId, fileName: file.originalname });

    // Create the file source
    const createFileSourceCommand = new CreateFileSourceCommand({
      threadId,
      userId: addFileSourceDto.userId,
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: file.buffer,
      fileName: file.originalname,
    });

    const fileSource = await this.createFileSourceUseCase.execute(
      createFileSourceCommand,
    );

    // Add the source to the thread
    const thread = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId, addFileSourceDto.userId),
    );

    await this.addSourceToThreadUseCase.execute(
      new AddSourceCommand(thread, fileSource),
    );

    return fileSource as unknown as FileSourceResponseDto;
  }

  // @Post(':id/sources/url')
  // @ApiOperation({ summary: 'Add a URL source to a thread' })
  // @ApiParam({
  //   name: 'id',
  //   description: 'The UUID of the thread',
  //   type: 'string',
  //   format: 'uuid',
  // })
  // @ApiBody({ type: AddUrlSourceToThreadDto })
  // @ApiResponse({
  //   status: 201,
  //   description: 'The URL source has been successfully added to the thread',
  //   type: UrlSourceResponseDto,
  // })
  // async addUrlSource(
  //   @Param('id', ParseUUIDPipe) threadId: UUID,
  //   @Body() addUrlSourceDto: AddUrlSourceToThreadDto,
  // ): Promise<UrlSourceResponseDto> {
  //   this.logger.log('addUrlSource', { threadId, url: addUrlSourceDto.url });

  //   // Create the URL source
  //   const createUrlSourceCommand = new CreateUrlSourceCommand({
  //     threadId,
  //     userId: addUrlSourceDto.userId,
  //     url: addUrlSourceDto.url,
  //   });

  //   const urlSource = await this.sourcesService.createUrlSource(
  //     createUrlSourceCommand,
  //   );

  //   // Add the source to the thread
  //   const thread = await this.threadsService.findOne(
  //     new FindThreadQuery(threadId, addUrlSourceDto.userId),
  //   );

  //   await this.threadsService.addSource(
  //     new AddSourceCommand(thread, urlSource),
  //   );

  //   return urlSource as unknown as UrlSourceResponseDto;
  // }

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
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) threadId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { threadId, sourceId });

    // First get the thread
    const thread = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId, userId),
    );

    // Remove the source from the thread
    await this.removeSourceFromThreadUseCase.execute(
      new RemoveSourceCommand(thread, sourceId),
    );

    // Delete the source
    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(sourceId, userId),
    );
  }
}
