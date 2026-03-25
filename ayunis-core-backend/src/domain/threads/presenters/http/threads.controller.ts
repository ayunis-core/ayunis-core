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
  HttpCode,
  HttpStatus,
  Query,
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
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateThreadUseCase } from '../../application/use-cases/create-thread/create-thread.use-case';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindAllThreadsUseCase } from '../../application/use-cases/find-all-threads/find-all-threads.use-case';
import { DeleteThreadUseCase } from '../../application/use-cases/delete-thread/delete-thread.use-case';
import { CreateThreadCommand } from '../../application/use-cases/create-thread/create-thread.command';
import { FindThreadQuery } from '../../application/use-cases/find-thread/find-thread.query';
import { FindAllThreadsQuery } from '../../application/use-cases/find-all-threads/find-all-threads.query';
import { DeleteThreadCommand } from '../../application/use-cases/delete-thread/delete-thread.command';
import { UpdateThreadTitleUseCase } from '../../application/use-cases/update-thread-title/update-thread-title.use-case';
import { UpdateThreadTitleCommand } from '../../application/use-cases/update-thread-title/update-thread-title.command';

import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadTitleDto } from './dto/update-thread-title.dto';
import { GetThreadResponseDto } from './dto/get-thread-response.dto';
import { GetThreadsResponseDtoItem } from './dto/get-threads-response-item.dto';
import { GetThreadsResponseDto } from './dto/get-threads-response.dto';
import { FindAllThreadsQueryParamsDto } from './dto/find-all-threads-query-params.dto';
import { GetThreadDtoMapper } from './mappers/get-thread.mapper';
import { GetThreadsDtoMapper } from './mappers/get-threads.mapper';

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
    private readonly getThreadDtoMapper: GetThreadDtoMapper,
    private readonly getThreadsDtoMapper: GetThreadsDtoMapper,
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
}
