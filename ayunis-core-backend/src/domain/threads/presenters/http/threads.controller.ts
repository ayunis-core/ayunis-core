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
  Res,
  StreamableFile,
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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import {
  detectFileType,
  isDocumentFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';

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
import { AddSourceCommand } from '../../application/use-cases/add-source-to-thread/add-source.command';
import { RemoveSourceCommand } from '../../application/use-cases/remove-source-from-thread/remove-source.command';
import { FindThreadSourcesQuery } from '../../application/use-cases/get-thread-sources/get-thread-sources.query';
import { CreateFileSourceCommand } from '../../../sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateTextSourceUseCase } from '../../../sources/application/use-cases/create-text-source/create-text-source.use-case';
import { AddFileSourceToThreadDto } from './dto/add-source-to-thread.dto';
import {
  FileSourceResponseDto,
  UrlSourceResponseDto,
  CSVDataSourceResponseDto,
} from './dto/get-thread-response.dto/source-response.dto';
import { SourceDtoMapper } from './mappers/source.mapper';
import { CreateThreadDto } from './dto/create-thread.dto';
import { GetThreadResponseDto } from './dto/get-thread-response.dto';
import { GetThreadsResponseDtoItem } from './dto/get-threads-response-item.dto';
import { GetThreadDtoMapper } from './mappers/get-thread.mapper';
import { GetThreadsDtoMapper } from './mappers/get-threads.mapper';
import * as fs from 'fs';
import { Source } from 'src/domain/sources/domain/source.entity';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { parseCSV, convertCSVToString } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { EmptyFileDataError } from '../../application/threads.errors';

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
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly sourceDtoMapper: SourceDtoMapper,
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
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<GetThreadResponseDto> {
    this.logger.log('findOne', { id });
    const thread = await this.findThreadUseCase.execute(
      new FindThreadQuery(id),
    );
    return this.getThreadDtoMapper.toDto(thread);
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
  ): Promise<void> {
    this.logger.log('addFileSource', { threadId, fileName: file.originalname });
    try {
      const sources: Source[] = [];

      // Detect file type using centralized utility
      const detectedType = detectFileType(file.mimetype, file.originalname);
      this.logger.debug('File type detection', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        detectedType,
      });

      if (isDocumentFile(detectedType)) {
        // Read file data from disk since we're using diskStorage
        const fileData = fs.readFileSync(file.path);
        // Create the file source
        const command = new CreateFileSourceCommand({
          fileType: file.mimetype,
          fileData: fileData,
          fileName: file.originalname,
        });
        const source = await this.createTextSourceUseCase.execute(command);
        sources.push(source);
      } else if (isCSVFile(detectedType)) {
        const fileData = fs.readFileSync(file.path, 'utf8');
        const { headers, data } = parseCSV(fileData);
        const command = new CreateCSVDataSourceCommand({
          name: file.originalname,
          data: {
            headers,
            rows: data,
          },
        });
        const source = await this.createDataSourceUseCase.execute(command);
        sources.push(source);
      } else if (isSpreadsheetFile(detectedType)) {
        const fileData = fs.readFileSync(file.path);
        const sheets = parseExcel(fileData);

        // Validate that the file contains processable data
        if (sheets.length === 0) {
          throw new EmptyFileDataError(file.originalname);
        }

        // Get the base filename without extension
        const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');

        for (const sheet of sheets) {
          // Create a source name: if single sheet, use filename; if multiple, include sheet name
          const sourceName =
            sheets.length === 1
              ? `${baseFileName}.csv`
              : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

          const command = new CreateCSVDataSourceCommand({
            name: sourceName,
            data: {
              headers: sheet.headers,
              rows: sheet.rows,
            },
          });
          const source = await this.createDataSourceUseCase.execute(command);
          sources.push(source);
        }
      } else {
        throw new Error('Invalid file type');
      }

      // Add all sources to the thread
      const thread = await this.findThreadUseCase.execute(
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
    const thread = await this.findThreadUseCase.execute(
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
}
