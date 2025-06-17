import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreateFileSourceDto } from './dto/create-file-source.dto';
import { CreateUrlSourceDto } from './dto/create-url-source.dto';
import { MatchSourceDto } from './dto/match-source.dto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

// Import use cases
import { GetSourceByIdUseCase } from '../../application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourcesByThreadIdUseCase } from '../../application/use-cases/get-sources-by-thread-id/get-sources-by-thread-id.use-case';
import { GetSourcesByUserIdUseCase } from '../../application/use-cases/get-sources-by-user-id/get-sources-by-user-id.use-case';
import { DeleteSourceUseCase } from '../../application/use-cases/delete-source/delete-source.use-case';
import { CreateFileSourceUseCase } from '../../application/use-cases/create-file-source/create-file-source.use-case';
import { CreateUrlSourceUseCase } from '../../application/use-cases/create-url-source/create-url-source.use-case';
import { MatchSourceContentChunksUseCase } from '../../application/use-cases/match-source-content-chunks/match-source-content-chunks.use-case';

// Import commands and queries
import { GetSourceByIdQuery } from '../../application/use-cases/get-source-by-id/get-source-by-id.query';
import { GetSourcesByThreadIdQuery } from '../../application/use-cases/get-sources-by-thread-id/get-sources-by-thread-id.query';
import { GetSourcesByUserIdQuery } from '../../application/use-cases/get-sources-by-user-id/get-sources-by-user-id.query';
import { DeleteSourceCommand } from '../../application/use-cases/delete-source/delete-source.command';
import { CreateFileSourceCommand } from '../../application/use-cases/create-file-source/create-file-source.command';
import { CreateUrlSourceCommand } from '../../application/use-cases/create-url-source/create-url-source.command';
import { MatchSourceCommand } from '../../application/use-cases/match-source-content-chunks/match-source.command';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  private readonly logger = new Logger(SourcesController.name);

  constructor(
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly getSourcesByThreadIdUseCase: GetSourcesByThreadIdUseCase,
    private readonly getSourcesByUserIdUseCase: GetSourcesByUserIdUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly createFileSourceUseCase: CreateFileSourceUseCase,
    private readonly createUrlSourceUseCase: CreateUrlSourceUseCase,
    private readonly matchSourceContentChunksUseCase: MatchSourceContentChunksUseCase,
  ) {}

  @ApiOperation({ summary: 'Get source by ID' })
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiResponse({ status: 200, description: 'Source found' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  @Get(':id')
  async getSourceById(@Param('id', ParseUUIDPipe) id: UUID) {
    this.logger.log(`Getting source by ID: ${id}`);
    return this.getSourceByIdUseCase.execute(new GetSourceByIdQuery(id));
  }

  @ApiOperation({ summary: 'Get sources by thread ID' })
  @ApiQuery({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Sources found' })
  @Get()
  async getSourcesByThreadId(@Query('threadId', ParseUUIDPipe) threadId: UUID) {
    this.logger.log(`Getting sources by thread ID: ${threadId}`);
    return this.getSourcesByThreadIdUseCase.execute(
      new GetSourcesByThreadIdQuery(threadId),
    );
  }

  @ApiOperation({ summary: 'Get sources by user' })
  @ApiResponse({ status: 200, description: 'User sources found' })
  @Get('user/sources')
  async getSourcesByUserId(@CurrentUser(UserProperty.ID) userId: UUID) {
    this.logger.log(`Getting sources by user ID: ${userId}`);
    return this.getSourcesByUserIdUseCase.execute(
      new GetSourcesByUserIdQuery(userId),
    );
  }

  @ApiOperation({ summary: 'Create a file source' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        threadId: {
          type: 'string',
          format: 'uuid',
        },
        fileName: {
          type: 'string',
        },
        fileType: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File source created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or request data' })
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async createFileSource(
    @UploadedFile() file: Express.Multer.File,
    @Body() createFileSourceDto: CreateFileSourceDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ) {
    this.logger.log('Creating file source', {
      fileName: file.originalname,
      threadId: createFileSourceDto.threadId,
    });

    if (!file) {
      throw new Error('File is required');
    }

    return this.createFileSourceUseCase.execute(
      new CreateFileSourceCommand({
        threadId: createFileSourceDto.threadId,
        userId,
        fileData: file.buffer,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      }),
    );
  }

  @ApiOperation({ summary: 'Create a URL source' })
  @ApiBody({ type: CreateUrlSourceDto })
  @ApiResponse({ status: 201, description: 'URL source created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or request data' })
  @Post('url')
  async createUrlSource(
    @Body() createUrlSourceDto: CreateUrlSourceDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ) {
    this.logger.log('Creating URL source', {
      url: createUrlSourceDto.url,
      threadId: createUrlSourceDto.threadId,
    });

    return this.createUrlSourceUseCase.execute(
      new CreateUrlSourceCommand({
        threadId: createUrlSourceDto.threadId,
        userId,
        url: createUrlSourceDto.url,
      }),
    );
  }

  @ApiOperation({ summary: 'Search/match source content chunks' })
  @ApiBody({ type: MatchSourceDto })
  @ApiResponse({
    status: 200,
    description: 'Source content chunks matching the query',
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @Post('search')
  async matchSourceContentChunks(@Body() matchSourceDto: MatchSourceDto) {
    this.logger.log('Matching source content chunks', {
      sourceId: matchSourceDto.sourceId,
      query: matchSourceDto.query,
    });

    return this.matchSourceContentChunksUseCase.execute(
      new MatchSourceCommand(
        { sourceId: matchSourceDto.sourceId },
        matchSourceDto.query,
        {
          similarityThreshold: matchSourceDto.similarityThreshold,
          limit: matchSourceDto.limit,
        },
      ),
    );
  }

  @ApiOperation({ summary: 'Delete source by ID' })
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiResponse({ status: 200, description: 'Source deleted successfully' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  @Delete(':id')
  async deleteSource(
    @Param('id', ParseUUIDPipe) id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ) {
    this.logger.log(`Deleting source by ID: ${id}`);
    return this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(id, userId),
    );
  }
}
